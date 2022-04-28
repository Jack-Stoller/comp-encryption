const objToHtml = {
    toNode: (obj) => {
        let el = document.createElement(obj.tag ?? 'div');
        for (let k in obj) {
            let v = obj[k];
            if (k === 'tag') continue;
            else if (k === 'children')
                for (let j = 0; j < v.length; j++)
                    el.appendChild(v[j] instanceof Element ? v[j] : objToHtml.toNode(v[j]))
            else if (k === 'text')
                el.textContent = v;
            else if (k === 'on')
                for (let e in v)
                    el.addEventListener(e, ...v[e]);
            else if (k === 'style')
                el.setAttribute('style', objToHtml.toCSS(v));
            else
                el.setAttribute(k.startsWith('_') ? k.substring(1, k.length) : k, v);
        }
        return el;
    },
    toCSS: (obj) => {
        let s = '';
        for (let k in obj)
            s += k.replaceAll(/([A-Z])/g, (_, b) => '-' + b.toLowerCase()) + ':' + obj[k] + ';';

        return s;
    }
};