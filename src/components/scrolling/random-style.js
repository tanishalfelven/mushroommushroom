import { randomArray, randomInt } from "../../lib/random.js";

const fonts = [
    "fantasy",
    "monospace",
    "cursive",
    "sans-serif",
    "serif"
];

const colors = [
    "#EBEBD3",
    "#F4D35E",
    "#EE964B",
    "#F95738"
];

const getStyle = () => `
    --rotate:    ${randomInt(-15, 15)}deg;
    color:       ${randomArray(colors)};
    font-family: ${randomArray(fonts)};
`;

export default getStyle;
