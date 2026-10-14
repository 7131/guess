// Siteswap text test class
class TextTest extends TestTable {

    // constructor
    constructor(id, body) {
        super(id, body);
        super.generate(TextData);
        this.start = super.start.bind(this, TextData.method);
    }

}

// Test base class
class TestBase extends TestTable {
    #list;
    #trials;

    // constructor
    constructor(id, body, data) {
        super(id, body);
        super.generate(data);
        this.#list = data.list;
        this.#trials = parseInt(data.trials, 10);

        // display the number of trials
        const span = document.getElementById(`${id}_trials`);
        if (span != null && !isNaN(this.#trials)) {
            span.textContent = this.#trials.toLocaleString();
        }
    }

    // get the number of trials
    get trials() {
        return this.#trials;
    }

    // test start
    start() {
        super.clearCol("result");
        setTimeout(this.test.bind(this), 0, 0, []);
    }

    // execute test
    test(index, errors) {
        if (index < this.#list.length) {
            // test row
            const data = this.#list[index];
            const message = this.executeRow(data.params, data.expect);
            if (message == "") {
                super.setText(index, "result", "OK");
            } else {
                super.setText(index, "result", message, "error");
                errors.push(index + 1);
            }
            setTimeout(this.test.bind(this), 0, index + 1, errors);
        } else {
            // result row
            if (errors.length == 0) {
                super.setFoot("result", "All OK");
            } else {
                super.setFoot("result", `NG: ${errors.join()}`, "error");
            }
            if (typeof this.completeEvent == "function") {
                this.completeEvent();
            }
        }
    }

    // execute by row (template method)
    executeRow(params, expect) {
        return "";
    }

}

// Fixed arguments test class
class FixedTest extends TestBase {
    #generator = new SiteswapGenerator();

    // constructor
    constructor(id, body) {
        super(id, body, FixedData);
    }

    // execute by row
    executeRow(params, expect) {
        const [ balls, period, height, multi, sync ] = params;
        const patterns = new Set();
        let limit = 10;
        let i = 0;
        while (i < this.trials && 0 < limit) {
            const throws = this.#generator.generateRandom(balls, period, height, multi, sync);
            if (throws.length == 0) {
                limit--;
                continue;
            }
            const text = SiteswapUtility.getText(throws, sync);
            const message = this.#validate(balls, period, height, multi, sync, text);
            if (message != "") {
                return message;
            }
            patterns.add(text);
            limit = 10;
            i++;
        }

        // number of generated kinds
        if (patterns.size < expect.kinds) {
            return `limited variety (${patterns.size} < ${expect.kinds})`
        }

        // patterns to be generated
        if (Array.isArray(expect.examples)) {
            for (const example of expect.examples) {
                if (!patterns.has(example)) {
                    return `not generated (${example})`;
                }
            }
        }
        return "";
    }

    // validate the pattern
    #validate(balls, period, height, multi, sync, text) {
        if (text == "") {
            return "no pattern";
        }

        // siteswap
        const siteswap = jmotion.Siteswap.analyze(text);
        if (!siteswap.valid) {
            return siteswap.message;
        }
        if (siteswap.sync != sync) {
            return "synchronization error";
        }
        if (siteswap.sync && text.includes("0x")) {
            return "including 0x";
        }

        // number of balls
        if (siteswap.count != balls) {
            return `incorrect ball count (${siteswap.count})`;
        }

        // period
        if (period < siteswap.period) {
            if (!sync || 1 < period) {
                return `period exceeded (${siteswap.period})`;
            }
        }

        // maximum height
        const max = siteswap.throws.reduce((prev, group) => group.reduce((acc, cur) => Math.max(acc, cur), prev), 0);
        if (height < max) {
            return `maximum height exceeded (${max.toString(36)})`;
        }

        // multiplex
        const multiples = siteswap.throws.filter(elem => 1 < elem.length);
        if (0 < multiples.length) {
            if (!multi) {
                return "multiplex error";
            }
            for (const group of multiples) {
                if (group.includes(0)) {
                    return `zero in the multiplex`;
                }
                if (group.some((val, idx) => group.indexOf(val) != idx)) {
                    return `same number in the multiplex (${group.join("")})`;
                }
            }
        } else {
            if (multi) {
                return "multiplex error";
            }
        }
        return "";
    }

}

// Flex arguments test class
class FlexTest extends TestBase {
    #generator = new SiteswapGenerator();

    // constructor
    constructor(id, body) {
        super(id, body, FlexData);
    }

    // execute by row
    executeRow(params, expect) {
        const patterns = new Set();
        for (let i = 0; i < this.trials; i++) {
            const pattern = this.#generator.generatePattern(params);
            const message = this.#validate(pattern);
            if (message != "") {
                return `${message} ${pattern.text} : ${JSON.stringify(pattern.args)}`;
            }
            patterns.add(pattern.text);
        }

        // number of generated kinds
        if (patterns.size < expect.kinds) {
            return `limited variety (${patterns.size} < ${expect.kinds})`
        }

        // patterns to be generated
        if (Array.isArray(expect.examples)) {
            for (const example of expect.examples) {
                if (!patterns.has(example)) {
                    return `not generated (${example})`;
                }
            }
        }
        return "";
    }

    // validate the pattern
    #validate(pattern) {
        if (!pattern.valid || !Array.isArray(pattern.throws) || pattern.throws.length == 0) {
            return "no pattern";
        }

        // siteswap
        const validation = jmotion.Siteswap.analyze(pattern.text);
        if (!validation.valid) {
            return validation.message;
        }
        if (validation.sync != pattern.args.sync) {
            return "synchronization error";
        }
        if (validation.sync && pattern.text.includes("0x")) {
            return "including 0x";
        }

        // number of balls
        if (pattern.count != validation.count || pattern.count != pattern.args.balls) {
            return `incorrect ball count (${pattern.count})`;
        }

        // period
        if (pattern.period != validation.period) {
            return `period error (${pattern.period})`;
        }
        if (pattern.args.period < pattern.period) {
            if (!pattern.args.sync || 1 < pattern.args.period) {
                return `period exceeded (${pattern.period})`;
            }
        }

        // maximum height
        const max = pattern.throws.reduce((prev, group) => group.reduce((acc, cur) => Math.max(acc, cur), prev), 0);
        if (pattern.args.height < max) {
            return `maximum height exceeded (${max.toString(36)})`;
        }

        // multiplex
        const multiples = pattern.throws.filter(elem => 1 < elem.length);
        if (0 < multiples.length) {
            if (!pattern.args.multi) {
                return "multiplex error";
            }
            for (const group of multiples) {
                if (group.includes(0)) {
                    return "zero in the multiplex";
                }
                if (group.some((val, idx) => group.indexOf(val) != idx)) {
                    return `same number in the multiplex (${group.join("")})`;
                }
            }
        } else {
            if (pattern.args.multi) {
                return "multiplex error";
            }
        }
        return "";
    }

}

// Scoring methods test class
class ScoringTest extends TestBase {
    #score = new Scoring();

    // constructor
    constructor(id, body) {
        super(id, body, ScoringData);
    }

    // execute by row
    executeRow(params, expect) {
        const guess = jmotion.Siteswap.analyze(params.guess);
        const correct = jmotion.Siteswap.analyze(params.correct);
        const input = this.#score.getResultInput(guess, correct);
        if (input.value != expect.input) {
            return `input: ${JSON.stringify(input)}`;
        }
        const balls = this.#score.getResultBalls(guess, correct);
        if (balls.value != expect.balls) {
            return `balls: ${JSON.stringify(balls)}`;
        }
        const pattern = this.#score.getResultPattern(guess, correct);
        if (pattern.value != expect.pattern) {
            return `pattern: ${JSON.stringify(pattern)}`;
        }
        return "";
    }

}

// Controller class
class Controller {
    #all;
    #tests = { "text": TextTest, "fixed": FixedTest, "flex": FlexTest, "scoring": ScoringTest };
    #buttons = new Map();
    #count = 0;

    // constructor
    constructor() {
        window.addEventListener("load", this.#initialize.bind(this));
    }

    // initialize the page
    #initialize(e) {
        for (const id in this.#tests) {
            const section = document.getElementById(id);

            // get table
            const table = section.querySelector("table");
            if (table == null || table.tBodies.length == 0) {
                continue;
            }
            const test = this.#tests[id];
            const instance = new test(id, table.tBodies[0]);
            instance.completeEvent = this.#setButtons.bind(this);

            // get button
            const button = section.querySelector("button");
            button.addEventListener("click", this.#executeTest.bind(this));
            this.#buttons.set(button, instance);
        }

        // run all
        this.#all = document.getElementById("all");
        this.#all.addEventListener("click", this.#executeAll.bind(this));
    }

    // execute all tests
    #executeAll(e) {
        this.#setButtons(true);
        this.#count = this.#buttons.size;
        for (const instance of this.#buttons.values()) {
            instance.start();
        }
    }

    // execute a test
    #executeTest(e) {
        this.#setButtons(true);
        this.#count = 1;
        this.#buttons.get(e.currentTarget).start();
    }

    // set the buttons
    #setButtons(disabled) {
        if (!disabled) {
            this.#count--;
            if (0 < this.#count) {
                return;
            }
        }
        this.#buttons.keys().forEach(elem => elem.disabled = disabled);
        this.#all.disabled = disabled;
    }

}

// start the controller
new Controller();

