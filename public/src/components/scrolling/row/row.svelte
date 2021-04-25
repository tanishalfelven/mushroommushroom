<link rel="stylesheet" href="./row.css">

<div class="{css.row}">
    <div
        class="{css.animgroup}"
        style="{groupStyle}"
    >
        {#each mushrooms as { text, style }}
            <div
                class="{css.mush}"
                style="{style}"
                on:click={() => click(text)}
            >
                {text}
            </div>
        {/each}
    </div>

    <div
        class="{css.animgroup}"
        style="{groupStyle}"
    >
        {#each mushrooms as { text, style }}
            <div
                class="{css.mush}"
                style="{style}"
                on:click={() => click(text)}
            >
                {text}
            </div>
        {/each}
    </div>
</div>

<script>
import needleStore from "../needle.js";

export let mushrooms = [];
export let height = 0;
export let slideRight = true;

$: groupStyle = `
    --from:      ${slideRight ? "-100%" : "0%"};
    --to:        ${slideRight ? "0%" : "-100%"};
    font-size:   ${height}px;
    height:      ${height}px;
    line-height: ${height}px;
`;

const click = (text) => {
    console.log("click", text);
    if(text === "fungi") {
        needleStore.set(true);
    }
}

$: console.log($needleStore);
</script>
