import timer from "./timer.js";

const wrapTitle = ({ interval = 250 } = false) => {
    const titleEl = document.querySelector("title");

    let title = titleEl.innerText;

    timer(interval, () => {
        const [ first, ...rest ] = title;

        // arrays let us skate around js strings not playing nice with unicode
        title = rest.concat(first).join("");

        titleEl.innerText = title;
    });
};

export default wrapTitle;
