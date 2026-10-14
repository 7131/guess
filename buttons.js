// Button class
class UseButton {
    #view;
    #disabled = false;

    // constructor
    constructor(id, x, y) {
        this.#view = document.createElementNS("http://www.w3.org/2000/svg", "use");
        this.#view.setAttribute("href", `#${id}`);
        this.#view.setAttribute("x", x);
        this.#view.setAttribute("y", y);
        this.setClass("normal");
    }

    // get the graphic element
    get view() {
        return this.#view;
    }

    // get whether disabled
    get disabled() {
        return this.#disabled;
    }

    // set whether disabled
    set disabled(value) {
        if (value == this.#disabled) {
            return;
        }
        this.#disabled = value;
        if (value) {
            this.setClass("disabled");
        } else {
            this.setClass("normal");
        }
    }

    // button press start
    press() {
        if (this.#disabled) {
            return;
        }
        this.setClass("active");
        window.setTimeout(this.#release.bind(this), 100);
    }

    // set a CSS class
    setClass(name) {
        this.#view.classList.remove(...this.#view.classList);
        this.#view.classList.add(name);
    }

    // button press stop
    #release() {
        if (this.#disabled) {
            return;
        }
        this.setClass("normal");
    }

}

// Button set class
class ButtonSet {
    #facade;
    #layer;
    #buttons = [];

    // constructor
    constructor(facade, layer) {
        this.#facade = facade;
        this.#layer = layer;
    }

    // get the simulator facade
    get facade() {
        return this.#facade;
    }

    // get the display layer
    get layer() {
        return this.#layer;
    }

    // get the list of buttons
    get buttons() {
        return this.#buttons;
    }

    // set the list of buttons
    set buttons(value) {
        if (Array.isArray(value)) {
            this.#buttons = value;
        } else {
            this.#buttons = [ value ];
        }
    }

    // initialize the buttons
    initialize() {
        this.#buttons.forEach(elem => elem.disabled = false);
    }

    // button press (template method)
    press(element) {
    }

}

// Zoom button class
class ZoomButtons extends ButtonSet {
    #in = new UseButton("zoom_in", 420, 330);
    #out = new UseButton("zoom_out", 420, 400);

    // constructor
    constructor(facade, layer) {
        super(facade, layer);
        this.buttons = [ this.#in, this.#out ];
        layer.appendChild(this.#in.view);
        layer.appendChild(this.#out.view);
    }

    // button press
    press(element) {
        if (element == this.#in.view) {
            // zoom in
            this.#in.press();
            this.facade.scale -= Math.ceil(this.facade.scale) / 10;
            this.#in.disabled = !this.facade.canZoomIn();
            this.#out.disabled = false;
        } else if (element == this.#out.view) {
            // zoom out
            this.#out.press();
            this.facade.scale += Math.ceil(this.facade.scale) / 10;
            this.#out.disabled = !this.facade.canZoomOut();
            this.#in.disabled = false;
        }
    }

}

// Speed button class
class SpeedButtons extends ButtonSet {
    #up = new UseButton("speed_up", 420, 80);
    #down = new UseButton("speed_down", 420, 150);
    #rewind = new UseButton("rewind", 420, 220);

    // constructor
    constructor(facade, layer) {
        super(facade, layer);
        this.buttons = [ this.#up, this.#down, this.#rewind ];
        layer.appendChild(this.#up.view);
        layer.appendChild(this.#down.view);
        layer.appendChild(this.#rewind.view);
    }

    // initialize the buttons
    initialize() {
        this.buttons.forEach(elem => elem.setClass("hidden"));
    }

    // button press
    press(element) {
        if (element == this.#up.view) {
            // speed up
            this.#up.press();
            this.facade.speed += 1;
            this.#up.disabled = !this.facade.canAccelerate();
            this.#down.disabled = false;
        } else if (element == this.#down.view) {
            // speed down
            this.#down.press();
            this.facade.speed -= 1;
            this.#down.disabled = !this.facade.canDecelerate();
            this.#up.disabled = false;
        } else if (element == this.#rewind.view) {
            this.#rewind.press();
            this.facade.startJuggling();
        }
    }

    // display the buttons
    appear() {
        this.buttons.forEach(elem => elem.setClass("normal"));
    }

}

// Hint button class
class HintButton extends ButtonSet {
    #speed;
    #sheet;
    #hint = new UseButton("hint", 20, 400);
    #methods = [ this.#setBallColors.bind(this), this.#setSpeedButtons.bind(this), this.#setBallOrbits.bind(this), this.#setHeightLines.bind(this) ];
    #index = 0;

    // constructor
    constructor(facade, layer) {
        super(facade, layer);
        this.buttons = [ this.#hint ];
        this.layer.appendChild(this.#hint.view);
        this.#speed = new SpeedButtons(facade, layer);
        this.#sheet = document.getElementById("hint_sheet");
    }

    // get the number of remaining hints
    get remain() {
        return this.#methods.length - this.#index;
    }

    // initialize the buttons
    initialize() {
        super.initialize();
        this.#speed.initialize();
        this.#clearHints();
    }

    // button press
    press(element) {
        if (element != this.#hint.view) {
            if (1 < this.#index) {
                this.#speed.press(element);
            }
            return;
        }
        if (this.#index < this.#methods.length) {
            this.#hint.press();
            this.#methods[this.#index]();
            this.#index++;
            this.#hint.disabled = this.#methods.length <= this.#index;
        }
    }

    // clear the hints
    #clearHints() {
        this.#index = 0;
        const balls = Array.from(this.facade.animator.core.middle.children).filter(elem => elem instanceof SVGUseElement);
        balls.forEach(elem => elem.removeAttribute("fill"));
        this.facade.animator.core.drawProps([]);
        Array.from(this.#sheet.children).forEach(this.#sheet.removeChild, this.#sheet);
    }

    // set the ball colors
    #setBallColors() {
        const colors = [ "red", "lime", "blue", "orange", "gray", "maroon", "green", "aqua", "olive", "fuchsia", "teal", "yellow", "navy", "silver", "purple", "black" ];
        const middle = this.facade.animator.core.middle;
        const balls = Array.from(middle.children).filter(elem => elem instanceof SVGUseElement).reverse();
        balls.forEach((val, idx) => val.setAttribute("fill", colors[idx % colors.length]));
        this.facade.startJuggling();
    }

    // set the speed buttons
    #setSpeedButtons() {
        this.#speed.appear();
    }

    // set the ball orbits
    #setBallOrbits() {
        const points = this.facade.animator.props.map(elem => elem.loop).flat();
        for (const point of points.filter((val, idx) => idx % 10 == 0)) {
            this.#appendElement("circle", { "cx": point.x, "cy": point.y, "r": 1, "fill": "indigo" });
        }
    }

    // set the height reference lines
    #setHeightLines() {
        // get the maximum height
        const throws = this.facade.pattern.throws;
        const numbers = throws.flat();
        let step = 1;
        if (this.facade.pattern.sync) {
            numbers.length = 0;
            step++;
            for (let i = 0; i < throws.length; i++) {
                for (let j = 0; j < throws[i].length; j++) {
                    const ball = throws[i][j];
                    if (ball % 2 == 0) {
                        numbers.push(ball);
                    } else {
                        numbers.push(ball + (i % 2) * 2 - 1);
                    }
                }
            }
        }
        const max = numbers.reduce((acc, cur) => Math.max(acc, cur), 5);
        const unit = -15 / this.facade.generator.scale;

        // baseline
        const dash = { "x1": -120, "y1": 0, "x2": 120, "y2": 0, "stroke": "tomato", "stroke-width": 3, "stroke-dasharray": "3" };
        this.#appendElement("line", Object.assign({ ...dash }, { "x1": -150, "x2": 150 }));

        // by height
        const number = { "x": 140, "y": 0, "text": 0, "fill": "tomato", "alignment-baseline": "middle" };
        for (let i = 2 + step; i <= max; i += step) {
            const height = (i - 1) * (i - 1) * unit;
            this.#appendElement("line", Object.assign({ ...dash }, { "y1": height, "y2": height }));
            this.#appendElement("text", Object.assign({ ...number }, { "y": height, "text": i.toString(36) }));
        }
    }

    // append a graphic element
    #appendElement(type, attributes) {
        const element = document.createElementNS("http://www.w3.org/2000/svg", type);
        for (const key in attributes) {
            if (key == "text") {
                element.textContent = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        }
        this.#sheet.appendChild(element);
    }

}
