// Controller class
class Controller {

    // constructor
    constructor() {
        window.addEventListener("load", this.#initialize.bind(this));
    }

    // initialize the page
    #initialize(e) {
        document.getElementById("display").addEventListener("submit", this.#display.bind(this));
        document.getElementById("copy").addEventListener("click", this.#copy.bind(this));
    }

    // "Display" button process
    #display(e) {
        e.preventDefault();
        const url = this.#generateUrl();
        if (url == "") {
            return;
        }
        window.location.href = url;
    }

    // "Copy" button process
    #copy(e) {
        window.navigator.clipboard.writeText(this.#generateUrl());
    }

    // generate the URL
    #generateUrl() {
        const message = document.getElementById("message");
        message.textContent = "";

        // analyze the siteswap
        const text = document.getElementById("siteswap").value;
        const result = jmotion.Siteswap.analyze(text);
        if (!result.valid) {
            message.textContent = result.message;
            return "";
        }

        // remove the repetition
        const short = SiteswapUtility.removeRepetition(result.throws, result.sync);
        const plain = SiteswapUtility.getText(short, result.sync);

        // get the encrypted string
        const binary = new Array(36).fill().map(() => String.fromCharCode(Math.floor(Math.random() * 256)));
        const salt = window.btoa(binary.join(""));
        const base64 = window.btoa(plain);
        const count = Math.max(2, salt.length - base64.length);
        const code = window.btoa(`${salt.slice(0, count)}:${base64}`);

        // build the URL
        const path = window.location.pathname.replace(/variation\.html$/, "index.html");
        return `${window.location.origin}${path}?code=${code}&title=fixed`;
    }

}

// start the controller
new Controller();
