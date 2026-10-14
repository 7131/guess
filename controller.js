// Controller class
class Controller {
    #main;
    #scenes;
    #index;
    #progress;
    #prev;

    // constructor
    constructor() {
        window.addEventListener("load", this.#initialize.bind(this));
    }

    // initialize the page
    #initialize(e) {
        this.#main = document.getElementById("main");
        this.#main.addEventListener("pointerdown", this.#tap.bind(this), { "passive": false });
        this.#main.addEventListener("wheel", this.#wheel.bind(this), { "passive": false });
        this.#main.addEventListener("touchstart", this.#start.bind(this), { "passive": false });
        this.#main.addEventListener("touchmove", this.#gesture.bind(this), { "passive": false });
        this.#main.addEventListener("touchend", this.#end.bind(this));
        this.#main.addEventListener("touchcancel", this.#end.bind(this));
        this.#main.addEventListener("keydown", this.#input.bind(this));
        this.#scenes = this.#generateScenes(this.#transition.bind(this));
        this.#index = this.#scenes.length;
        this.#transition();
    }

    // tap gesture
    #tap(e) {
        this.#scenes[this.#index].mode.tap(e);
    }

    // wheel operation
    #wheel(e) {
        if (!this.#scenes[this.#index].mode.movable) {
            return;
        }
        e.preventDefault();
        if (e.ctrlKey) {
            const delta = 1 - (e.deltaX + e.deltaY) * 2 / this.#main.clientWidth;
            this.#scenes[this.#index].mode.zoom(delta);
        } else {
            this.#scenes[this.#index].mode.pan(e.deltaX, e.deltaY);
        }
    }

    // start gesture
    #start(e) {
        if (e.touches.length != 2 || !this.#scenes[this.#index].mode.movable) {
            return;
        }
        e.preventDefault();
        this.#prev = Array.from(e.touches).map(elem => new DOMPoint(elem.pageX, elem.pageY));
    }

    // gesture control
    #gesture(e) {
        if (e.touches.length != 2 || this.#prev == null || !this.#scenes[this.#index].mode.movable) {
            return;
        }
        e.preventDefault();

        // get the coordinates
        const curr = [];
        const dir = [];
        for (let i = 0; i < e.touches.length; i++) {
            curr.push(new DOMPoint(e.touches[i].pageX, e.touches[i].pageY));
            dir.push(new DOMPoint(curr[i].x - this.#prev[i].x, curr[i].y - this.#prev[i].y));
        }
        const before = this.#getDistance(this.#prev[0], this.#prev[1]);
        const after = this.#getDistance(curr[0], curr[1]);
        this.#prev = curr;

        // change the size
        const delta = after / before;
        if (0.01 <= Math.abs(delta - 1)) {
            this.#scenes[this.#index].mode.zoom(delta);
            return;
        }

        // move
        const dx = (dir[0].x + dir[1].x) / 2;
        const dy = (dir[0].y + dir[1].y) / 2;
        this.#scenes[this.#index].mode.pan(dx, dy);
    }

    // gesture end
    #end(e) {
        this.#prev = null;
    }

    // key input
    #input(e) {
        if (e.key.length != 1) {
            return;
        }
        e.preventDefault();
        this.#scenes[this.#index].mode.enter(e.key);
    }

    // mode transition
    #transition() {
        if (this.#scenes.length - 1 <= this.#index) {
            // from the beginning
            this.#scenes.forEach(elem => elem.mode.terminate());
            this.#index = 0;
            this.#progress = { "total": 0, "prev": null };
        } else {
            // continue
            const mode = this.#scenes[this.#index].mode;
            mode.terminate();
            const number = parseInt(mode.result.score, 10);
            if (!isNaN(number)) {
                this.#progress.total += number;
            }
            if (typeof mode.result.correct == "object") {
                this.#progress.prev = mode.result.correct;
            }
            this.#index++;
        }

        // next mode
        const scene = this.#scenes[this.#index];
        if (scene.setting instanceof ModeBase) {
            scene.setting.result.score = this.#progress.total;
            scene.mode.initialize(scene.setting.result);
        } else {
            scene.setting.prev = this.#progress.prev;
            scene.mode.initialize(scene.setting);
        }
    }

    // generate a list of scenes
    #generateScenes(callback) {
        const cover = new CoverMode(callback);
        const game = new GameMode(callback);
        const score = new ScoreMode(callback);
        const total = new TotalMode(callback);
        [ cover, game, score, total ].forEach(elem => elem.terminate());

        // list of scenes
        const scenes = [];
        const settings = this.#generateSettings();
        if (Array.isArray(settings)) {
            // multiple rounds
            scenes.push({ "mode": cover, "setting": {} });
            for (const setting of settings) {
                scenes.push({ "mode": game, "setting": setting });
                scenes.push({ "mode": score, "setting": game });
            }
            scenes.push({ "mode": total, "setting": score });
        } else {
            // 1 round only
            scenes.push({ "mode": game, "setting": settings });
            scenes.push({ "mode": score, "setting": game });
        }
        return scenes;
    }

    // generate settings
    #generateSettings() {
        const search = new URLSearchParams(window.location.search);
        if (search.has("title")) {
            // title
            const title = document.querySelector("title");
            title.textContent += ` (${search.get("title")})`;
            const h1 = document.querySelector("h1");
            if (h1) {
                h1.textContent = title.textContent;
            }
        }
        if (search.has("code")) {
            // when a siteswap is specified
            try {
                const code = window.atob(search.get("code"));
                const index = code.indexOf(":");
                if (0 <= index) {
                    const plain = window.atob(code.slice(index + 1));
                    const result = jmotion.Siteswap.analyze(plain);
                    if (result.valid) {
                        return result;
                    }
                }
            } catch {
            }
        }

        // parse the query string
        let found = false;
        const params = new SiteswapParams();
        for (const key of [ "balls", "period", "height" ]) {
            if (search.has(key)) {
                found = true;
                params[key] = this.#getRange(search.get(key), params[key].min, params[key].max);
            }
        }
        for (const key of [ "multi", "sync" ]) {
            if (search.has(key)) {
                found = true;
                params[key] = this.#getInt(search.get(key), params[key], 0, 100);
            }
        }
        if (found) {
            return params;
        }
        const settings = [
            new SiteswapParams(3, 3, 7),
            new SiteswapParams(4, 4, 9),
            new SiteswapParams(5, 5, 11, 30),
            new SiteswapParams(7, 6, 13, 0, 30),
            new SiteswapParams(9, 8, 15, 30, 30),
        ];
        settings.forEach((val, idx) => val.round = idx + 1);
        return settings;
    }

    // get an integer value
    #getInt(text, def, min, max) {
        const number = parseInt(text, 10);
        if (isNaN(number)) {
            return def;
        }
        return Math.max(min, Math.min(number, max));
    }

    // get the integer range
    #getRange(text, min, max) {
        const range = { min, max };
        const pair = text.split("-");

        // minimum value
        range.min = this.#getInt(pair[0], min, min, max);
        if (pair.length < 2) {
            range.max = range.min;
            return range;
        }

        // maximum value
        range.max = this.#getInt(pair[1], max, range.min, max);
        return range;
    }

    // get the distance
    #getDistance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

}

// start the controller
new Controller();
