// this is a simple setInterval wrapper that is a bit more sane
const timer = (timeout, func) => {
    let i = 0;

    const id = setInterval(() => {
        func(i++);
    }, timeout);

    return () => clearInterval(id);
};

export default timer;
