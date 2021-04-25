<link rel="stylesheet" href="./scrolling.css">

<div
    class="{css.marqueeland}"
    bind:this={containerEl}
>
    {#each mushroomRows as mushrooms, i}
        <Row
            {mushrooms}
            {height}
            slideRight={i % 2}
        />
    {/each}
</div>

<div
    class="{css.needleModal}"
    style="--in: {$needleStore ? "0" : "1"}"
    on:click={() => {
        if($needleStore) {
            $needleStore = false;
        }
    }}
>
    Congrats, you are a mushroom.
</div>

<script>
import { randomInt } from "../../lib/random.js";
import getStyle from "./random-style.js";
import needleStore from "./needle.js";
import Row from "./row/row.svelte";

const WIDTH = 30;
const HEIGHT = 30;

const needle = randomInt(0, WIDTH*HEIGHT);

const mushroomRows = Array.from({ length : HEIGHT }, (e, y) => {
    return Array.from({ length: WIDTH }, (e, x) => ({
        text  : (y*WIDTH + x) === needle ? "fungi" : "mushroom",
        style : getStyle(),
    }));
});

let containerEl;
let height = 0;
$: if(containerEl) {
    height = containerEl.getBoundingClientRect().height / HEIGHT;
}

$: console.log($needleStore);
</script>
