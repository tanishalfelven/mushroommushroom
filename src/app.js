import wrapTitle from "./lib/title.js";
import Layout from "./components/layout/layout.svelte";

wrapTitle();

new Layout({
    target: document.body
});
