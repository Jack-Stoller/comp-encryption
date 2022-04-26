class Slide extends HTMLElement {
    constructor() {

        super();

        this.attachShadow({mode: 'open'}); // sets and returns 'this.shadowRoot'

        // Create (nested) span elements
        this.wrapper = objToHtml.toNode({
            tag: 'div',
            class: 'wrapper out',
            text: ' '
        });

        let styles = objToHtml.toNode({
            tag: 'style',
            text: `
                .wrapper.out .letter {
                    transform: translate3d(0, 100%, 0) !important;
                }
            `
        })

        // attach the created elements to the shadow DOM
        this.shadowRoot.append(styles, this.wrapper);

        this.options = {
            transitionTime: 500
        };
    }

    connectedCallback() {
        setTimeout(() => {

            //This is the time difference between each letter
            let timeForEachLetter = this.options.transitionTime / this.textContent.length;

            let text = this.textContent.trim() + ' ';

            this.wrapper.appendChild(objToHtml.toNode({
                tag: 'div',
                children: text.split('').map((c, i) => ({
                    tag: 'span',
                    style: {
                        clipPath: 'inset(0 0 0 0)'
                    },
                    children: [
                        {
                            tag: 'span',
                            class: 'letter',
                            text: c,
                            style: {
                                display: 'inline-block',
                                whiteSpace: 'pre',
                                transform: 'translate3d(0, 0, 0)',
                                willChange: 'transform',
                                transition: `transform ${timeForEachLetter * i}ms ease-in-out`
                            }
                        }
                    ]
                }))
            }));
        });
    }

    in() {
        this.wrapper.classList.remove('out');
    }

    out() {
        this.wrapper.classList.add('out');
    }

    focus() {
        this.wrapper.classList.remove('out');

        setTimeout(() => {
            this.wrapper.classList.add('out');
        }, this.options.transitionTime);
    }
}

customElements.define('ani-slide', Slide);