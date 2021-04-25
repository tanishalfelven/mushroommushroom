import { writable } from "svelte/store";

const needleFound = writable(false);

export default needleFound;
