// Scoring class
class Scoring {
    #score = { "input": 1, "balls": 2, "pattern": 17, "repeat": -1, "reverse": -2, "cyclic": -5 };

    // get the result of the input string
    getResultInput(guess, correct) {
        if (guess.text == null) {
            return { "text": "syntax error", "value": 0 };
        }
        if (guess.valid) {
            return { "text": "jugglable", "value": this.#score.input };
        } else {
            return { "text": "not jugglable", "value": 0 };
        }
    }

    // get the result of the number of balls
    getResultBalls(guess, correct) {
        if (!guess.valid) {
            return { "text": "N/A", "value": 0 };
        }
        if (guess.count == correct.count) {
            return { "text": `matched (${guess.count})`, "value": this.#score.balls };
        } else {
            return { "text": `not matched (${guess.count} : ${correct.count})`, "value": 0 };
        }
    }

    // get the result of the pattern
    getResultPattern(guess, correct) {
        if (!guess.valid) {
            return { "text": "N/A", "value": 0 };
        }
        const failure = { "text": "not matched", "value": 0 };
        if (guess.count != correct.count) {
            return failure;
        }
        if (guess.sync) {
            if (correct.sync) {
                return this.#getResultSync(guess.throws, correct.throws, failure);
            } else {
                return this.#getResultBoth(guess.throws, correct.throws, failure);
            }
        } else {
            if (correct.sync) {
                return this.#getResultBoth(correct.throws, guess.throws, failure);
            } else {
                return this.#getResultAsync(guess.throws, correct.throws, failure);
            }
        }
    }

    // get asynchronous results
    #getResultAsync(guess, correct, failure) {
        let value = this.#score.pattern;
        if (SiteswapUtility.areSame(guess, correct)) {
            return { "text": "exactly matched", "value": value };
        }
        if (SiteswapUtility.areCyclicSame(guess, correct)) {
            return { "text": "matched (shifted)", "value": value + this.#score.cyclic };
        }
        const short = SiteswapUtility.removeRepetition(guess, false);
        value += this.#score.repeat;
        if (SiteswapUtility.areSame(short, correct)) {
            return { "text": "matched (duplicated)", "value": value };
        }
        if (SiteswapUtility.areCyclicSame(short, correct)) {
            return { "text": "matched (duplicated)", "value": value + this.#score.cyclic };
        }
        return failure;
    }

    // get synchronous results
    #getResultSync(guess, correct, failure) {
        let value = this.#score.pattern;
        if (SiteswapUtility.areSame(guess, correct)) {
            return { "text": "exactly matched", "value": value };
        }
        if (SiteswapUtility.areCyclicSame(guess, correct, 2)) {
            return { "text": "matched (shifted)", "value": value + this.#score.cyclic };
        }
        const short = SiteswapUtility.removeRepetition(guess, true);
        if (short.length != guess.length) {
            value += this.#score.repeat;
        }
        if (SiteswapUtility.areSame(short, correct)) {
            return { "text": "matched (duplicated)", "value": value };
        }
        if (SiteswapUtility.areCyclicSame(short, correct, 2)) {
            return { "text": "matched (duplicated)", "value": value + this.#score.cyclic };
        }

        // flip left and right
        const reverse = [];
        for (let i = 0; i < short.length; i += 2) {
            reverse.push(short[i + 1].map(elem => elem + (elem % 2) * 2));
            reverse.push(short[i].map(elem => elem - (elem % 2) * 2));
        }
        value += this.#score.reverse;
        if (SiteswapUtility.areSame(reverse, correct)) {
            return { "text": "matched (reversed)", "value": value };
        }
        if (SiteswapUtility.areCyclicSame(reverse, correct, 2)) {
            return { "text": "matched (reversed)", "value": value + this.#score.cyclic };
        }
        return failure;
    }

    // get the results for both synchronous and asynchronous
    #getResultBoth(synchro, asynchro, failure) {
        let value = this.#score.pattern;
        const zero = group => group.every(elem => elem == 0);
        const two = group => group.every(elem => elem == 2);
        if (synchro.every(zero) && asynchro.every(zero) || synchro.every(two) && asynchro.every(two)) {
            // only 0s, or only 2s
            if (synchro.length == 2 && asynchro.length == 1) {
                return { "text": "exactly matched", "value": value };
            }
            value += this.#score.repeat;
            return { "text": "matched (duplicated)", "value": value };
        }
        if (asynchro.length % 2 == 1 || asynchro.some(group => group.some(elem => elem % 2 == 1))) {
            return failure;
        }

        // at least one of the two sides consists only of 0s and 2s
        const right = (val, idx) => idx % 2 == 1 || val.every(elem => elem == 0 || elem == 2);
        const left = (val, idx) => idx % 2 == 0 || val.every(elem => elem == 0 || elem == 2);
        if (!synchro.every(right) && !synchro.every(left)) {
            return failure;
        }
        return this.#getResultSync(synchro, asynchro, failure);
    }

}

// Mode base class
class ModeBase {
    #layer;
    #transition;
    #result = {};

    // constructor
    constructor(id, transition) {
        this.#layer = document.getElementById(id);
        this.#transition = transition;
    }

    // get the display layer
    get layer() {
        return this.#layer;
    }

    // get whether movable
    get movable() {
        return false;
    }

    // get the execution result
    get result() {
        return this.#result;
    }

    // set the execution result
    set result(value) {
        this.#result = value;
    }

    // initialize the class
    initialize(setting) {
        this.#layer.classList.remove("hidden");
    }

    // terminate the class
    terminate() {
        this.#layer.classList.add("hidden");
    }

    // mode transition
    transition() {
        if (typeof this.#transition == "function") {
            this.#transition();
        }
    }

    // zoom in or out (template method)
    zoom(delta) {
    }

    // screen movement (template method)
    pan(dx, dy) {
    }

    // input to the SVG (template method)
    enter(key) {
    }

    // whether it is a use element
    isUseElement(element, href) {
        if (element instanceof SVGUseElement) {
            if (element.getAttribute("href") == `#${href}`) {
                return true;
            }
        }
        return false;
    }

    // get the graphic element tree
    getElementTree(parent) {
        const elements = this.#getElements(parent);
        const all = new Map();
        for (const element of elements) {
            const ids = element.id.split("_");
            const name = ids.pop();
            let part = all;
            for (const category of ids) {
                if (part.has(category)) {
                    const value = part.get(category);
                    if (!(value instanceof Map)) {
                        const tree = new Map();
                        tree.set("", value);
                        part.set(category, tree);
                    }
                } else {
                    part.set(category, new Map());
                }
                part = part.get(category);
            }
            part.set(name, element);
        }
        return all;
    }

    // tap gesture (template method)
    tap(e) {
    }

    // get the list of graphic elements
    #getElements(parent) {
        let elements = [];
        if (parent.id != "") {
            elements.push(parent);
        }
        for (const child of parent.children) {
            elements = elements.concat(this.#getElements(child));
        }
        return elements;
    }

}

// Cover mode class
class CoverMode extends ModeBase {
    #back;

    // constructor
    constructor(transition) {
        super("cover", transition);
        this.#back = document.getElementById("back");
    }

    // initialize the class
    initialize(setting) {
        super.initialize(setting);
        this.#back.classList.add("transparent");
    }

    // terminate the class
    terminate() {
        this.#back.classList.remove("transparent");
        super.terminate();
    }

    // tap gesture
    tap(e) {
        if (!super.isUseElement(e.target, "start")) {
            return;
        }
        super.transition();
    }

}

// Game mode class
class GameMode extends ModeBase {
    #buttons;
    #zoomIn;
    #zoomOut;
    #entry;
    #estimate;
    #guess;
    #opening;
    #finish;
    #facade = new Facade("#space");
    #generator = new SiteswapGenerator();
    #oneTime = false;

    // constructor
    constructor(transition) {
        super("game", transition);
        this.#setShapes(this.#facade.animator.core, this.#facade.generator);

        // buttons
        const tree = super.getElementTree(this.layer).get("game");
        this.#buttons = [ ZoomButtons, HintButton ].map(elem => new elem(this.#facade, tree.get("buttons")));
        this.#zoomIn = this.#buttons[0].buttons[0];
        this.#zoomOut = this.#buttons[0].buttons[1];
        this.#entry = document.getElementById("entry");
        this.#estimate = document.getElementById("estimate");
        this.#guess = document.getElementById("guess");
        this.#entry.addEventListener("submit", this.#press.bind(this));
        this.#estimate.addEventListener("input", this.#input.bind(this));

        // visual effectors
        this.#opening = new RoundEffector(tree.get("round"));
        this.#finish = new GuessEffector(tree.get("veil"), tree.get("guess"));
        this.#finish.callback = super.transition.bind(this);
    }

    // get whether movable
    get movable() {
        return true;
    }

    // initialize the class
    initialize(setting) {
        super.initialize(setting);
        this.#entry.classList.remove("transparent");
        this.#estimate.value = "";
        this.#guess.disabled = true;
        this.#buttons.forEach(elem => elem.initialize());
        let pattern;
        if (setting.valid) {
            // a siteswap was specified
            pattern = setting;
            this.#oneTime = true;
        } else {
            // generate randomly
            pattern = this.#generator.generatePattern(setting);
            this.#oneTime = false;
        }
        if (!isNaN(parseInt(setting.round, 10))) {
            this.#opening.initialize(setting);
        }
        this.#facade.startJuggling(pattern);
    }

    // zoom in or out
    zoom(delta) {
        this.#facade.scale /= delta;
        this.#zoomIn.disabled = !this.#facade.canZoomIn();
        this.#zoomOut.disabled = !this.#facade.canZoomOut();
    }

    // screen movement
    pan(dx, dy) {
        this.#facade.pan(dx, dy);
    }

    // input to the SVG
    enter(key) {
        this.#estimate.focus();
        this.#estimate.value += key;
        this.#input({ "key": key });
    }

    // tap gesture
    tap(e) {
        e.preventDefault();
        this.#buttons.forEach(elem => elem.press(e.target));
    }

    // input to the text box
    #input(e) {
        this.#guess.disabled = this.#estimate.value == "";
    }

    // button press
    #press(e) {
        e.preventDefault();
        const hint = this.#buttons.find(elem => elem instanceof HintButton);
        this.result = { "correct": this.#facade.pattern, "guess": this.#estimate.value, "hints": hint.remain, "onetime": this.#oneTime };

        // cleanup
        this.#facade.stopJuggling();
        this.#entry.classList.add("transparent");
        this.#guess.disabled = true;

        // guess effector
        const start = new DOMPoint(30, 480);
        const end = new DOMPoint(155, 70);
        this.#finish.initialize({ "guess": this.#estimate.value, "start": start, "end": end });
    }

    // set the shapes
    #setShapes(core, generator) {
        const tree = super.getElementTree(core.svg);
        const arm = tree.get("arm");
        const ar = arm.get("right");
        const al = arm.get("left");
        const orbit = tree.get("orbit");
        const or = orbit.get("right");
        const ol = orbit.get("left");

        // setting
        core.setBody([ tree.get("man") ]);
        core.setArms([ [ ar.get("0"), ar.get("1") ], [ al.get("0"), al.get("1") ] ]);
        core.setHands([]);
        core.props = [ tree.get("ball") ];
        generator.offset.right = { "x": 0, "y": 0 };
        generator.offset.left = { "x": 0, "y": 0 };
        generator.paths.right = [ [ or.get("00"), or.get("10") ], [ or.get("01"), or.get("11") ] ];
        generator.paths.left = [ [ ol.get("00"), ol.get("10") ], [ ol.get("01"), ol.get("11") ] ];
    }

}

// Score mode class
class ScoreMode extends ModeBase {
    #texts;
    #values;
    #button;
    #scale = { "min": 0.5, "mid": 1, "max": 2, "value": 1 };
    #cx = { "min": 0, "mid": 250, "max": 500, "value": 250 };
    #cy = { "min": 0, "mid": 250, "max": 500, "value": 250 };
    #score = new Scoring();

    // constructor
    constructor(transition) {
        super("score", transition);
        const tree = super.getElementTree(this.layer).get("score");
        this.#texts = tree.get("text");
        this.#values = tree.get("value");
        this.#button = tree.get("ok");
    }

    // get whether movable
    get movable() {
        return true;
    }

    // initialize the class
    initialize(setting) {
        super.initialize(setting);
        this.layer.removeAttribute("transform");
        this.#scale.value = this.#scale.mid;
        this.#cx.value = this.#cx.mid;
        this.#cy.value = this.#cy.mid;
        this.result = { "score": this.#showResult(setting) };
    }

    // zoom in or out
    zoom(delta) {
        const before = this.#scale.value;
        this.#scale.value = this.#limit(before * delta, this.#scale);
        const ratio = this.#scale.value / before - 1;
        const dx = (this.#cx.value - this.#cx.mid) * ratio;
        const dy = (this.#cy.value - this.#cy.mid) * ratio;
        this.pan(dx, dy);
    }

    // screen movement
    pan(dx, dy) {
        this.#cx.value = this.#limit(this.#cx.value + dx, this.#cx);
        this.#cy.value = this.#limit(this.#cy.value + dy, this.#cy);
        const center = `translate(${-this.#cx.mid} ${-this.#cy.mid})`;
        const zoom = `scale(${this.#scale.value})`;
        const move = `translate(${this.#cx.value} ${this.#cy.value})`;
        this.layer.setAttribute("transform", `${move} ${zoom} ${center}`);
    }

    // tap gesture
    tap(e) {
        if (!super.isUseElement(e.target, "ok")) {
            return;
        }
        super.transition();
    }

    // show the result
    #showResult(result) {
        this.#texts.get("guess").textContent = result.guess;
        this.#texts.get("correct").textContent = result.correct.text;

        // analyze the input string
        const guess = jmotion.Siteswap.analyze(result.guess);
        const input = this.#score.getResultInput(guess, result.correct);
        this.#texts.get("input").textContent = input.text;
        this.#values.get("input").textContent = input.value;
        const balls = this.#score.getResultBalls(guess, result.correct);
        this.#texts.get("balls").textContent = balls.text;
        this.#values.get("balls").textContent = balls.value;
        const pattern = this.#score.getResultPattern(guess, result.correct);
        this.#texts.get("pattern").textContent = pattern.text;
        this.#values.get("pattern").textContent = pattern.value;

        // total
        const sum = input.value + balls.value + pattern.value;
        this.#values.get("sum").textContent = sum;
        this.#texts.get("hints").textContent = result.hints;
        this.#values.get("hints").innerHTML = `&times;${result.hints + 1}`;
        const score = sum * (result.hints + 1);
        this.#values.get("result").textContent = score;
        if (result.onetime) {
            this.#button.classList.add("hidden");
        } else {
            this.#button.classList.remove("hidden");
        }
        return score;
    }

    // limit the range of values
    #limit(value, range) {
        return Math.max(range.min, Math.min(value, range.max));
    }

}

// Total mode class
class TotalMode extends ModeBase {
    #effector;

    // constructor
    constructor(transition) {
        super("total", transition);
        this.#effector = new TotalEffector(document.getElementById("total_value"));
    }

    // initialize the class
    initialize(setting) {
        super.initialize(setting);
        this.#effector.initialize({ "count": setting.score });
    }

    // tap gesture
    tap(e) {
        if (!super.isUseElement(e.target, "ok")) {
            return;
        }
        super.transition();
    }

}
