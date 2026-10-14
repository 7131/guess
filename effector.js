// Visual effector base class
class EffectorBase {
    #callback;
    #interval = 20;
    #count = 50;
    #index = 0;

    // constructor
    constructor(interval) {
        const number = parseInt(interval, 10);
        if (!isNaN(number) && 0 < number) {
            this.#interval = number;
        }
    }

    // get the callback function
    get callback() {
        return this.#callback;
    }

    // set the callback function
    set callback(value) {
        this.#callback = value;
    }

    // get the number of frames
    get count() {
        return this.#count;
    }

    // initialize the class
    initialize(setting) {
        if (setting != null) {
            const number = parseInt(setting.count, 10);
            if (!isNaN(number) && 0 <= number) {
                this.#count = number;
            }
        }
        this.#index = 0;
        window.setTimeout(this.#step.bind(this), this.#interval);
    }

    // terminate the class
    terminate() {
        if (typeof this.#callback == "function") {
            this.#callback();
        }
    }

    // do the next operation (template method)
    doNext(index) {
    }

    // next step
    #step() {
        if (this.#index < this.#count) {
            // running
            this.doNext(this.#index);
            this.#index++;
            window.setTimeout(this.#step.bind(this), this.#interval);
        } else {
            // end
            this.terminate();
        }
    }

}

// Round effector class
class RoundEffector extends EffectorBase {
    #text;
    #round = 0;
    #delta = new DOMPoint(0, 0);

    // constructor
    constructor(text) {
        super();
        this.#text = text;
    }

    // initialize the class
    initialize(setting) {
        super.initialize({ "count": 50 });
        this.#round = setting.round;
        this.#text.textContent = `Round ${this.#round}`;
        this.#text.setAttribute("x", 250);
        this.#text.setAttribute("y", 50);
        this.#delta.x = 0;
    }

    // terminate the class
    terminate() {
        if (this.#round < 0) {
            this.#text.textContent = -this.#round;
            this.#text.setAttribute("x", 30);
            super.terminate();
        } else {
            this.#delta.x = -13;
            this.#round = -this.#round;
            super.initialize({ "count": 20 });
        }
    }

    // do the next operation
    doNext(index) {
        const x = parseFloat(this.#text.getAttribute("x"));
        const y = parseFloat(this.#text.getAttribute("y"));
        this.#text.setAttribute("x", x + this.#delta.x);
        this.#text.setAttribute("y", y + this.#delta.y);
    }

}

// Guess effector class
class GuessEffector extends EffectorBase {
    #veil;
    #text;
    #delta = new DOMPoint(0, 0);

    // constructor
    constructor(veil, text) {
        super();
        this.#veil = veil;
        this.#text = text;
    }

    // initialize the class
    initialize(setting) {
        super.initialize(setting);
        this.#veil.classList.remove("hidden");
        this.#veil.setAttribute("fill-opacity", 0);
        this.#text.classList.remove("hidden");
        this.#text.textContent = setting.guess;
        this.#text.setAttribute("x", setting.start.x);
        this.#text.setAttribute("y", setting.start.y);
        this.#delta.x = (setting.end.x - setting.start.x) / this.count;
        this.#delta.y = (setting.end.y - setting.start.y) / this.count;
    }

    // terminate the class
    terminate() {
        this.#veil.classList.add("hidden");
        this.#text.classList.add("hidden");
        this.#text.textContent = "";
        super.terminate();
    }

    // do the next operation
    doNext(index) {
        this.#veil.setAttribute("fill-opacity", (1 + index / this.count) / 2);
        const x = parseFloat(this.#text.getAttribute("x"));
        const y = parseFloat(this.#text.getAttribute("y"));
        this.#text.setAttribute("x", x + this.#delta.x);
        this.#text.setAttribute("y", y + this.#delta.y);
    }

}

// Total effector class
class TotalEffector extends EffectorBase {
    #element;

    // constructor
    constructor(element) {
        super(5);
        this.#element = element;
    }

    // initialize the class
    initialize(setting) {
        super.initialize(setting);
        this.#element.textContent = 0;
    }

    // do the next operation
    doNext(index) {
        this.#element.textContent = index + 1;
    }

}
