// Siteswap parameters class
class SiteswapParams {

    // constructor
    constructor(balls, period, height, multi, sync) {
        this.balls = { "min": 1, "max": balls || 35 };
        this.period = { "min": 1, "max": period || 35 };
        this.height = { "min": 1, "max": height || 35 };
        this.multi = multi || 0;
        this.sync = sync || 0;
        this.prev = null;
    }

}

// Siteswap utility class
class SiteswapUtility {

    // get siteswap text
    static getText(throws, sync) {
        if (!Array.isArray(throws) || throws.some(elem => !Array.isArray(elem))) {
            return "";
        }
        if (throws.some(group => group.map(elem => parseInt(elem, 10)).some(elem => isNaN(elem) || elem < 0))) {
            return "";
        }

        // asynchronous pattern
        if (!sync) {
            return throws.map(elem => SiteswapUtility.#getBeatText(elem, 0)).join("");
        }

        // synchronous pattern
        const texts = [];
        for (let i = 0; i < throws.length; i += 2) {
            const left = SiteswapUtility.#getBeatText(throws[i], -1);
            const right = SiteswapUtility.#getBeatText(throws[i + 1], 1);
            texts.push(`(${left},${right})`);
        }
        return texts.join("");
    }

    // remove the repetition
    static removeRepetition(throws, sync) {
        const period = throws.length;
        const addition = 1 + Number(sync);
        let stride = addition;
        let result = throws;
        while (result == throws && stride <= period / 2) {
            if (period % stride == 0) {
                const unit = throws.slice(0, stride);
                let valid = true;
                let index = stride;
                while (valid && index < period) {
                    valid = SiteswapUtility.areSame(unit, throws.slice(index, index + stride));
                    index += stride;
                }
                if (valid) {
                    result = unit;
                }
            }
            stride += addition;
        }
        return result;
    }

    // rotate the pattern
    static rotate(throws, value) {
        const number = parseInt(value, 10);
        if (!Array.isArray(throws) || throws.length == 0 || isNaN(number)) {
            return throws;
        }
        const division = number % throws.length;
        return throws.slice(division).concat(throws.slice(0, division));
    }

    // are the 2 patterns the same
    static areSame(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b)) {
            return false;
        }
        if (a.length != b.length) {
            return false;
        }

        // check the elements
        for (let i = 0; i < a.length; i++) {
            if (!Array.isArray(a[i]) || !Array.isArray(b[i])) {
                return false;
            }
            if (a[i].length != b[i].length) {
                return false;
            }

            // check the numbers within the elements
            const bi = b[i].concat();
            for (const value of a[i]) {
                const index = bi.indexOf(value);
                if (index < 0) {
                    return false;
                }
                bi.splice(index, 1);
            }
        }
        return true;
    }

    // are the 2 patterns cyclically same
    static areCyclicSame(a, b, step) {
        if (!Array.isArray(a) || !Array.isArray(b)) {
            return false;
        }
        if (a.length != b.length) {
            return false;
        }
        let number = parseInt(step, 10);
        if (isNaN(number) || number <= 0) {
            number = 1;
        }

        // a phase shift is not a problem
        for (let i = 0; i < a.length; i += number) {
            const rotation = SiteswapUtility.rotate(a, i);
            if (SiteswapUtility.areSame(rotation, b)) {
                return true;
            }
        }
        return false;
    }

    // get a siteswap beat
    static #getBeatText(each, cross) {
        const convert = [];
        for (const ball of each) {
            if (ball % 2 == 0 || cross == 0) {
                convert.push(ball.toString(36));
            } else {
                convert.push(`${(ball + cross).toString(36)}x`);
            }
        }
        let text = convert.join("");
        if (2 <= each.length) {
            text = `[${text}]`;
        }
        return text;
    }

}

// Siteswap generator class
class SiteswapGenerator {

    // generate a pattern object
    generatePattern(params) {
        let minBalls = params.balls.min;
        let minPeriod = params.period.min;
        if (params.prev != null) {
            minBalls = Math.max(minBalls, params.prev.count + 1);
            minPeriod = Math.max(minPeriod, params.prev.period + 1);
        }

        // generate parameters
        const balls = this.#getRandomPoisson(minBalls, params.balls.max);
        const period = this.#getRandomPoisson(minPeriod, params.period.max);
        const height = this.#getRandomPoisson(balls + period, params.height.max);
        const multi = this.#getRandomInt(100) < params.multi;
        const sync = this.#getRandomInt(100) < params.sync;
        const args = { "balls": balls, "period": period, "height": height, "multi": multi, "sync": sync };
        let throws = [];
        let limit = 10;
        while (0 < limit && throws.length == 0) {
            throws = this.generateRandom(balls, period, height, multi, sync);
            limit--;
        }
        const pattern = {
            "valid": false,
            "throws": throws,
            "sync": sync,
            "text": SiteswapUtility.getText(throws, sync),
            "period": throws.length,
            "args": args,
        };
        if (throws.length == 0) {
            return pattern;
        }
        pattern.valid = true;
        pattern.count = this.#getBalls(throws);
        pattern.state = this.#getState(throws);
        return pattern;
    }

    // generate a random throws
    generateRandom(balls, period, height, multi, sync) {
        if (sync) {
            // set the synchronization period
            period = Math.max(2, Math.floor(period / 2) * 2);
        }
        let throws = new Array(period).fill().map(() => [ balls ]);
        if (multi) {
            // setup the multiplex
            if (!this.#tryMultiplex(throws, height)) {
                return [];
            }
            let max = balls - 1;
            let valid = true;
            while (this.#getRandomInt(50) < max && valid) {
                const backup = window.structuredClone(throws);
                valid = this.#tryMultiplex(throws, height);
                if (!valid) {
                    throws = backup;
                }
                max--;
            }
        }
        height -= Number(sync);
        throws = this.#swapNumbers(throws, height);
        if (sync) {
            // synchronization correction
            throws = this.#setSynchronous(throws, height);
        }
        throws = SiteswapUtility.removeRepetition(throws, sync);
        throws.forEach(elem => elem.sort((a, b) => b - a));
        return throws;
    }

    // try the multiplex
    #tryMultiplex(throws, height) {
        const sequence = this.#shuffleSequence(throws.length);
        const ei = sequence[sequence.length - 1];
        const end = throws[ei];
        const ep = end.length;
        end.push(0);

        // swap
        while (0 < sequence.length) {
            const si = sequence.shift();
            const start = throws[si];
            for (let i = 0; i < start.length; i++) {
                if (this.#canSwap(throws, si, i, ei, ep, height)) {
                    let diff = ei - si;
                    if (diff <= 0) {
                        diff += throws.length;
                    }
                    const sv = start[i] - diff;
                    const ev = end[ep] + diff;
                    start[i] = ev;
                    end[ep] = sv;
                    return true;
                }
            }
        }
        return false;
    }

    // set the synchronous pattern
    #setSynchronous(throws, height) {
        let even = throws.filter((val, idx) => idx % 2 == 0 && val.includes(1));
        let odd = throws.filter((val, idx) => idx % 2 == 1 && val.includes(1));
        if (odd.length < even.length) {
            throws = SiteswapUtility.rotate(throws, 1);
            [ even, odd ] = [ odd, even ];
        }
        if (even.length == 0) {
            return throws;
        }

        // remove throws with a height of 1 on even timing
        for (const target of even) {
            const ti = throws.indexOf(target);
            const tp = target.indexOf(1);

            // check whether a simplex 1 can be changed to 0
            if (target.length == 1) {
                const start = throws.find((val, idx) => val.some(elem => (idx + elem) % throws.length == ti));
                const si = throws.indexOf(start);
                const sp = start.findIndex(elem => (si + elem) % throws.length == ti);
                if (start[sp] < height && !start.includes(start[sp] + 1)) {
                    start[sp]++;
                    target[tp]--;
                    continue;
                }
            }

            // when there is a single landing point
            const ei = (ti + 1) % throws.length;
            const end = throws[ei];
            if (end.length == 1) {
                if (height <= end[0] || target.includes(end[0] + 1)) {
                    return [];
                }
                target[tp] += end[0];
                end[0] = 0;
                continue;
            }

            // when there are multiple landing points
            const availables = end.filter(elem => !target.includes(elem + 1));
            if (availables.length == 0 || target.length < 2 && end.length < 3) {
                return [];
            }
            const ep = end.indexOf(availables[0]);
            target[tp] += end[ep];
            end.splice(ep, 1);
        }
        return throws;
    }

    // swap the numbers
    #swapNumbers(throws, height) {
        const period = throws.length;
        if (period < 2) {
            return throws;
        }

        // swapping them out about (period + 10) times should be enough
        const count = period + 10;
        for (let i = 0; i < count; i++) {
            const si = this.#getRandomInt(period);
            const sp = this.#getRandomInt(throws[si].length);
            if (throws[si][sp] < 1) {
                continue;
            }
            let diff = this.#getRandomInt(Math.min(throws[si][sp], period - 1)) + 1;
            let sv = throws[si][sp] - diff;
            let ei = (si + diff) % period;
            let ep = this.#getRandomInt(throws[ei].length);
            let ev = throws[ei][ep] + diff;
            while (0 < diff && !this.#canSwap(throws, si, sp, ei, ep, height)) {
                diff--;
                sv++;
                ei = (si + diff) % period;
                ep = this.#getRandomInt(throws[ei].length);
                ev = throws[ei][ep] + diff;
            }
            if (diff == 0) {
                continue;
            }
            throws[ei][ep] = sv;
            throws[si][sp] = ev;
        }
        return throws;
    }

    // whether it can be swapped
    #canSwap(throws, si, sp, ei, ep, height) {
        if (si == ei && sp == ep) {
            return false;
        }
        let diff = ei - si;
        if (diff <= 0) {
            diff += throws.length;
        }
        const start = throws[si];
        const end = throws[ei];
        const sv = start[sp] - diff;
        const ev = end[ep] + diff;

        // if the number after swap is equal to the number before, or greater than the maximum number
        if (ev == start[sp] || height < ev) {
            return false;
        }

        // if the number after swap is less than the minimum number
        if (sv < 0 || sv == 0 && 1 < end.length) {
            return false;
        }

        // if the number matches any of the other numbers inside the multiplex
        if (si == ei) {
            if (sv == ev) {
                return false;
            }
            const large = Math.max(sp, ep);
            const small = Math.min(sp, ep);
            const remain = this.#getRemain(this.#getRemain(start, large), small);
            if (remain.includes(sv) || remain.includes(ev)) {
                return false;
            }
        } else {
            if (this.#getRemain(end, ep).includes(sv)) {
                return false;
            }
            if (this.#getRemain(start, sp).includes(ev)) {
                return false;
            }
        }
        return true;
    }

    // get the remaining elements of the array
    #getRemain(array, index) {
        return array.slice(0, index).concat(array.slice(index + 1));
    }

    // shuffle the sequence
    #shuffleSequence(period) {
        const before = new Array(period).fill().map((val, idx) => idx);
        const after = [];
        while (0 < before.length) {
            const single = before.splice(this.#getRandomInt(before.length), 1);
            after.push(single[0]);
        }
        return after;
    }

    // get the siteswap state
    #getState(throws) {
        const max = throws.flat().reduce((acc, cur) => Math.max(acc, cur));
        const width = Math.ceil(max / throws.length) * throws.length;
        const state = new Array(width + max).fill(0);
        for (let i = 0; i < width; i += throws.length) {
            throws.forEach((val, idx) => val.forEach(elem => state[i + idx + elem]++));
        }
        while (state[state.length - 1] == 0) {
            state.pop();
        }
        return state.slice(width);
    }

    // get the number of balls
    #getBalls(throws) {
        return throws.flat().reduce((acc, cur) => acc + cur) / throws.length;
    }

    // generate a random integer
    #getRandomInt(end) {
        return this.#getRandomRange(0, end);
    }

    // generate a random integer within a specified range
    #getRandomRange(start, end) {
        return Math.floor(Math.random() * (end - start)) + start;
    }

    // generate a random integer following a Poisson distribution
    #getRandomPoisson(min, max) {
        if (max < min) {
            min = max;
        }
        const lambda = (min + max) / 2;
        const limit = Math.exp(-lambda);
        let count = 0;
        let value = Math.random();
        while (limit <= value) {
            count++;
            value *= Math.random();
        }
        return Math.max(min, Math.min(count, max));
    }

}
