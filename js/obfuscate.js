class Obfuscator extends HTMLElement {
    constructor() {

        super();

        this.attachShadow({mode: 'open'});

        // Create (nested) span elements
        this.wrapper = objToHtml.toNode({
            tag: 'div',
            class: 'wrapper',
            style: {
                fontFamily: 'MajorMono',
                whiteSpace: 'pre'
            },
            text: ' '
        });

        // attach the created elements to the shadow DOM
        this.shadowRoot.append(this.wrapper);

        this.options = {
            characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()`~-_=+[]\\{}|;\':",./<>?',
            timesPerSwitch: 100
        };
    }

    connectedCallback() {
        setTimeout(() => {
            this.setAttribute('data-base-text', this.textContent);
        });
    }

    in(speed = 1) {
        //Stop any existing animations
        clearInterval(this.interval);

        let baseText = this.getAttribute('data-base-text');

        if (!baseText) return;

        let i = 0;

        this.interval = setInterval(() => {
            if (++i >= baseText.length + 1) {
                clearInterval(this.interval);

                this.wrapper.textContent = baseText;
            } else {
                this.wrapper.textContent = baseText.substring(0, i - 1) + this._randChar();
            }

        }, this.options.timesPerSwitch / speed);
    }

    out(speed = 1) {
        //Stop any existing animations
        clearInterval(this.interval);

        let baseText = this.getAttribute('data-base-text');

        if (!baseText) return;

        let i = 0;

        this.interval = setInterval(() => {

            if (++i >= baseText.length + 1) {
                clearInterval(this.interval);

                this.wrapper.textContent = ' ';
            } else {
                this.wrapper.textContent = baseText.substring(0, baseText.length - i) + this._randChar();
            }

        }, this.options.timesPerSwitch / speed);
    }

    focus(speed = 1) {
        //Stop any existing animations
        clearInterval(this.interval);

        let baseText = this.getAttribute('data-base-text');

        if (!baseText) return;

        let i = 0;

        this.interval = setInterval(() => {

            if (++i >= baseText.length + 1) {
                clearInterval(this.interval);

                this.wrapper.textContent = baseText;
            } else {
                this.wrapper.textContent = baseText.substring(0, i - 1) + this._randChar() + baseText.substring(i, baseText.length);
            }

        }, this.options.timesPerSwitch / speed);
    }

    _getRandText(baseText) {
        let t = '';
        for (let i = 0; i < baseText.length; i++) t += this._randChar();
        return t;
    }

    _randChar() {
        return this.options.characters.charAt(Math.floor(this.options.characters.length * Math.random()));
    }
}

customElements.define('ani-obfuscator', Obfuscator);