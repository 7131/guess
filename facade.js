// Facade class for simulator
class Facade {
    #matrix;
    #area;
    #pattern;
    #center = new DOMPoint(0, 0);
    #scale = { "min": 0.5, "max": 8.5, "value": 1 };
    #speed = { "min": 1, "max": 20, "value": 10 };

    // constructor
    constructor(svg) {
        const core = new jmotion.Core(svg);
        this.animator = new jmotion.Animator(core);
        this.generator = new jmotion.CalmGenerator(this.#speed.value);

        // rendering information
        let element = core.svg;
        if (!(element instanceof SVGSVGElement)) {
            element = element.ownerSVGElement;
        }
        this.#matrix = element.getScreenCTM().inverse();
        const box = core.svg.viewBox.baseVal;
        this.#area = new DOMRect(box.x, box.y, box.width, box.height);
    }

    // get the pattern object
    get pattern() {
        return this.#pattern;
    }

    // get the screen scale
    get scale() {
        return this.#scale.value;
    }

    // set the screen scale
    set scale(value) {
        this.#scale.value = this.#limit(this.#scale.min, value, this.#scale.max);
        this.pan(0, 0);
    }

    // get the animation speed
    get speed() {
        return this.#speed.value;
    }

    // set the animation speed
    set speed(value) {
        this.#speed.value = this.#limit(this.#speed.min, value, this.#speed.max);
        this.animator.speed = this.#speed.value;
    }

    // start juggling simulator
    startJuggling(pattern) {
        this.animator.stop();
        if (pattern == null) {
            this.animator.index = 0;
            this.animator.start(this.#speed.value);
            return "";
        }
        this.#pattern = pattern;

        // generate coordinate list
        const table = jmotion.Siteswap.separate(this.#pattern.throws, this.#pattern.sync);
        const orbits = this.generator.calculateOrbits(table, this.#pattern.sync, this.#pattern.throws);
        this.animator.props = orbits.props;
        this.animator.arms = orbits.arms;

        // start animation
        this.#center = new DOMPoint(0, 0);
        this.#scale.value = this.generator.scale;
        this.#speed.value = 10;
        this.animator.core.scale = this.#scale.value;
        this.animator.index = 0;
        this.animator.start(this.#speed.value);
        return "";
    }

    // stop juggling simulator
    stopJuggling() {
        this.animator.stop();
    }

    // screen movement
    pan(dx, dy) {
        const delta = this.#getDelta(dx, dy);
        const left = this.#area.left * this.#scale.value;
        const right = this.#area.right * this.#scale.value;
        const actual = this.generator.scale - 1;
        const top = Math.min(-this.#area.bottom * this.#scale.value, this.#area.top * actual);
        const bottom = -this.#area.top * this.#scale.value;
        this.#center.x = this.#limit(left, this.#center.x - delta.x, right);
        this.#center.y = this.#limit(top, this.#center.y - delta.y, bottom);
        const stride = right - left;
        const x = -stride / 2 + this.#center.x;
        const y = this.#area.y * this.#scale.value + this.#center.y;
        this.animator.core.svg.setAttribute("viewBox", `${x} ${y} ${stride} ${stride}`);
    }

    // whether it can zoom in
    canZoomIn() {
        return this.#scale.min < this.#scale.value;
    }

    // whether it can zoom out
    canZoomOut() {
        return this.#scale.value < this.#scale.max;
    }

    // whether it can accelerate
    canAccelerate() {
        return this.#speed.value < this.#speed.max;
    }

    // whether it can decelerate
    canDecelerate() {
        return this.#speed.min < this.#speed.value;
    }

    // get the displacement delta
    #getDelta(dx, dy) {
        const before = new DOMPoint(0, 0).matrixTransform(this.#matrix);
        const after = new DOMPoint(dx * this.#scale.value / 2, dy * this.#scale.value / 2).matrixTransform(this.#matrix);
        return new DOMPoint(after.x - before.x, after.y - before.y);
    }

    // limit the range of values
    #limit(min, value, max) {
        return Math.max(min, Math.min(value, max));
    }

}
