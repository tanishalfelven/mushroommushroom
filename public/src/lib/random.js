const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min)) + min;
};

const randomArray = (arr) => {
    return arr[randomInt(0, arr.length)];
}

export {
    randomInt,
    randomArray,
};
