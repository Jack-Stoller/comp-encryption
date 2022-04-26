const Parallex = {
    elements: [],
    parsentEls: [],

    resizeObserver: new ResizeObserver((e) => {
        for (let i = 0; i < e.length; i++) {
            for (let j = 0; j < Parallex.elements.length; j++) {
                if (Parallex.elements[j].element == e[i].target) {
                    let el = Parallex.elements[j].element;

                    if (el.hasAttribute('data-parallex-space')) {

                        //Firefox... =(
                        let boxSize = (Array.isArray(e[i].borderBoxSize)) ? e[i].borderBoxSize[0] : e[i].borderBoxSize;

                        el.previousElementSibling.style.height = boxSize.blockSize + 'px';
                        Parallex.elements[j].spaceY = -boxSize.blockSize;
                    }
                }
            }

            //Check parents aswell
            for (let j = 0; j < Parallex.parsentEls.length; j++) {
                if (Parallex.elements[j].parent == e[i].target) {
                    let entry = Parallex.elements[j];

                    if (entry.resize) {
                        let boxSize = (Array.isArray(e[i].borderBoxSize)) ? e[i].borderBoxSize[0] : e[i].borderBoxSize;
                        entry.element.style.height = boxSize.blockSize + 'px';
                        entry.element.style.width = boxSize.inlineSize + 'px';
                    }
                }
            }
        }
    }),

    init: () => {

        new MutationObserver((e) => {
            for (let i = 0; i < e.length; i++) {
                if (e[i].addedNodes) {
                    for (let j = 0; j < e[i].addedNodes.length; j++) {
                        if (e[i].addedNodes[j].hasAttribute) {
                            if (e[i].addedNodes[j].hasAttribute('data-parallex-speed')) {
                                Parallex.elements.push(Parallex.prepElement(e[i].addedNodes[j]))
                            }
                        }
                    }
                }
            }
        }).observe(
            document.documentElement || document.body,
            {
                subtree: true,
                childList: true,
                attributes: false
            }
        );

        requestAnimationFrame(Parallex.loop);

    },

    prepElement: (el) => {

        let box = el.getBoundingClientRect();
        el.style.position = 'fixed';
        let spaceY = 0;

        if (el.hasAttribute('data-parallex-inherit-size')) {
            let p = el.parentNode;

            let b = p.getBoundingClientRect();
            el.style.height = b.height + 'px';
            el.style.width = b.width + 'px';

            Parallex.parsentEls.push({
                parent: p,
                element: el,
                resize: true
            });
            Parallex.resizeObserver.observe(p);
        }


        if (el.hasAttribute('data-parallex-space')) {

            let h = el.getBoundingClientRect().height;
            el.parentNode.insertBefore(
                objToHtml.toNode({
                    tag: 'div',
                    style: {
                        height: box.height + 'px'
                    }
                }),
                el
            )
            spaceY = box.height;
        }

        Parallex.resizeObserver.observe(el);

        let s = -1 * el.getAttribute('data-parallex-speed');

        return {
            element: el,
            speed: s,
            spaceY: spaceY //+ (window.pageYOffset + box.top) * -s
        };
    },

    loop: () => {

        let scrollY = window.scrollY;


        for (let i = 0; i < Parallex.elements.length; i++) {
            Parallex.elements[i].element.style.transform = `translate3d(0, ${Parallex.elements[i].speed * scrollY + Parallex.elements[i].spaceY}px, 0)`
        }

        requestAnimationFrame(Parallex.loop);
    }
}

Parallex.init();