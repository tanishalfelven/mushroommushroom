// this is a simple setInterval wrapper that is a bit more sane
const timer = (timeout, func) => {
    let i = 0;

    const id = setInterval(() => {
        func(i++);
    }, timeout);

    return () => clearInterval(id);
};

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

function noop() { }
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function validate_store(store, name) {
    if (store != null && typeof store.subscribe !== 'function') {
        throw new Error(`'${name}' is not a store with a 'subscribe' method`);
    }
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function set_store_value(store, ret, value = ret) {
    store.set(value);
    return ret;
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : options.context || []),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.37.0' }, detail)));
}
function append_dev(target, node) {
    dispatch_dev('SvelteDOMInsert', { target, node });
    append(target, node);
}
function insert_dev(target, node, anchor) {
    dispatch_dev('SvelteDOMInsert', { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev('SvelteDOMRemove', { node });
    detach(node);
}
function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
    const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
    if (has_prevent_default)
        modifiers.push('preventDefault');
    if (has_stop_propagation)
        modifiers.push('stopPropagation');
    dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
    const dispose = listen(node, event, handler, options);
    return () => {
        dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
        dispose();
    };
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
    else
        dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
}
function set_data_dev(text, data) {
    data = '' + data;
    if (text.wholeText === data)
        return;
    dispatch_dev('SvelteDOMSetData', { node: text, data });
    text.data = data;
}
function validate_each_argument(arg) {
    if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
        let msg = '{#each} only iterates over array-like objects.';
        if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
            msg += ' You can use a spread to convert this iterable into an array.';
        }
        throw new Error(msg);
    }
}
function validate_slots(name, slot, keys) {
    for (const slot_key of Object.keys(slot)) {
        if (!~keys.indexOf(slot_key)) {
            console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
        }
    }
}
/**
 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
 */
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error("'target' is a required option");
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn('Component was already destroyed'); // eslint-disable-line no-console
        };
    }
    $capture_state() { }
    $inject_state() { }
}

var css$2 = {
    "layout": "mc805548d2_layout"
};

var css$1 = {
    "marqueeland": "mcb372e550_marqueeland",
    "needleModal": "mcb372e550_needleModal"
};

const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min)) + min;
};

const randomArray = (arr) => {
    return arr[randomInt(0, arr.length)];
};

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

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

const needleFound = writable(false);

var css = {
    "row": "mc54668074_row",
    "animgroup": "mc54668074_animgroup",
    "mush": "mc54668074_mush"
};

/* src\components\scrolling\row\row.svelte generated by Svelte v3.37.0 */

const { console: console_1$1 } = globals;
const file$2 = "src\\components\\scrolling\\row\\row.svelte";

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i].text;
	child_ctx[9] = list[i].style;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i].text;
	child_ctx[9] = list[i].style;
	return child_ctx;
}

// (6:8) {#each mushrooms as { text, style }}
function create_each_block_1(ctx) {
	let div;
	let t0_value = /*text*/ ctx[8] + "";
	let t0;
	let t1;
	let div_style_value;
	let mounted;
	let dispose;

	function click_handler() {
		return /*click_handler*/ ctx[6](/*text*/ ctx[8]);
	}

	const block = {
		c: function create() {
			div = element("div");
			t0 = text(t0_value);
			t1 = space();
			attr_dev(div, "class", "mc54668074_mush");
			attr_dev(div, "style", div_style_value = /*style*/ ctx[9]);
			add_location(div, file$2, 6, 12, 173);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, t0);
			append_dev(div, t1);

			if (!mounted) {
				dispose = listen_dev(div, "click", click_handler, false, false, false);
				mounted = true;
			}
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*mushrooms*/ 1 && t0_value !== (t0_value = /*text*/ ctx[8] + "")) set_data_dev(t0, t0_value);

			if (dirty & /*mushrooms*/ 1 && div_style_value !== (div_style_value = /*style*/ ctx[9])) {
				attr_dev(div, "style", div_style_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_1.name,
		type: "each",
		source: "(6:8) {#each mushrooms as { text, style }}",
		ctx
	});

	return block;
}

// (21:8) {#each mushrooms as { text, style }}
function create_each_block$1(ctx) {
	let div;
	let t0_value = /*text*/ ctx[8] + "";
	let t0;
	let t1;
	let div_style_value;
	let mounted;
	let dispose;

	function click_handler_1() {
		return /*click_handler_1*/ ctx[7](/*text*/ ctx[8]);
	}

	const block = {
		c: function create() {
			div = element("div");
			t0 = text(t0_value);
			t1 = space();
			attr_dev(div, "class", "mc54668074_mush");
			attr_dev(div, "style", div_style_value = /*style*/ ctx[9]);
			add_location(div, file$2, 21, 12, 532);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, t0);
			append_dev(div, t1);

			if (!mounted) {
				dispose = listen_dev(div, "click", click_handler_1, false, false, false);
				mounted = true;
			}
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*mushrooms*/ 1 && t0_value !== (t0_value = /*text*/ ctx[8] + "")) set_data_dev(t0, t0_value);

			if (dirty & /*mushrooms*/ 1 && div_style_value !== (div_style_value = /*style*/ ctx[9])) {
				attr_dev(div, "style", div_style_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block$1.name,
		type: "each",
		source: "(21:8) {#each mushrooms as { text, style }}",
		ctx
	});

	return block;
}

function create_fragment$2(ctx) {
	let div2;
	let div0;
	let t;
	let div1;
	let each_value_1 = /*mushrooms*/ ctx[0];
	validate_each_argument(each_value_1);
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	let each_value = /*mushrooms*/ ctx[0];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			div2 = element("div");
			div0 = element("div");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t = space();
			div1 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr_dev(div0, "class", "mc54668074_animgroup");
			attr_dev(div0, "style", /*groupStyle*/ ctx[1]);
			add_location(div0, file$2, 1, 4, 34);
			attr_dev(div1, "class", "mc54668074_animgroup");
			attr_dev(div1, "style", /*groupStyle*/ ctx[1]);
			add_location(div1, file$2, 16, 4, 393);
			attr_dev(div2, "class", "mc54668074_row");
			add_location(div2, file$2, 0, 0, 0);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div2, anchor);
			append_dev(div2, div0);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(div0, null);
			}

			append_dev(div2, t);
			append_dev(div2, div1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div1, null);
			}
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*mushrooms, click*/ 5) {
				each_value_1 = /*mushrooms*/ ctx[0];
				validate_each_argument(each_value_1);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(div0, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (dirty & /*groupStyle*/ 2) {
				attr_dev(div0, "style", /*groupStyle*/ ctx[1]);
			}

			if (dirty & /*mushrooms, click*/ 5) {
				each_value = /*mushrooms*/ ctx[0];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div1, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty & /*groupStyle*/ 2) {
				attr_dev(div1, "style", /*groupStyle*/ ctx[1]);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div2);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$2.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$2($$self, $$props, $$invalidate) {
	let groupStyle;
	let $needleStore;
	validate_store(needleFound, "needleStore");
	component_subscribe($$self, needleFound, $$value => $$invalidate(5, $needleStore = $$value));
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Row", slots, []);
	let { mushrooms = [] } = $$props;
	let { height = 0 } = $$props;
	let { slideRight = true } = $$props;

	const click = text => {
		console.log("click", text);

		if (text === "fungi") {
			needleFound.set(true);
		}
	};

	const writable_props = ["mushrooms", "height", "slideRight"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Row> was created with unknown prop '${key}'`);
	});

	const click_handler = text => click(text);
	const click_handler_1 = text => click(text);

	$$self.$$set = $$props => {
		if ("mushrooms" in $$props) $$invalidate(0, mushrooms = $$props.mushrooms);
		if ("height" in $$props) $$invalidate(3, height = $$props.height);
		if ("slideRight" in $$props) $$invalidate(4, slideRight = $$props.slideRight);
	};

	$$self.$capture_state = () => ({
		css,
		needleStore: needleFound,
		mushrooms,
		height,
		slideRight,
		click,
		groupStyle,
		$needleStore
	});

	$$self.$inject_state = $$props => {
		if ("mushrooms" in $$props) $$invalidate(0, mushrooms = $$props.mushrooms);
		if ("height" in $$props) $$invalidate(3, height = $$props.height);
		if ("slideRight" in $$props) $$invalidate(4, slideRight = $$props.slideRight);
		if ("groupStyle" in $$props) $$invalidate(1, groupStyle = $$props.groupStyle);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*slideRight, height*/ 24) {
			$$invalidate(1, groupStyle = `
    --from:      ${slideRight ? "-100%" : "0%"};
    --to:        ${slideRight ? "0%" : "-100%"};
    font-size:   ${height}px;
    height:      ${height}px;
    line-height: ${height}px;
`);
		}

		if ($$self.$$.dirty & /*$needleStore*/ 32) {
			console.log($needleStore);
		}
	};

	return [
		mushrooms,
		groupStyle,
		click,
		height,
		slideRight,
		$needleStore,
		click_handler,
		click_handler_1
	];
}

class Row extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { mushrooms: 0, height: 3, slideRight: 4 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Row",
			options,
			id: create_fragment$2.name
		});
	}

	get mushrooms() {
		throw new Error("<Row>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set mushrooms(value) {
		throw new Error("<Row>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get height() {
		throw new Error("<Row>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set height(value) {
		throw new Error("<Row>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get slideRight() {
		throw new Error("<Row>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set slideRight(value) {
		throw new Error("<Row>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src\components\scrolling\scrolling.svelte generated by Svelte v3.37.0 */

const { console: console_1 } = globals;
const file$1 = "src\\components\\scrolling\\scrolling.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[7] = list[i];
	child_ctx[9] = i;
	return child_ctx;
}

// (5:4) {#each mushroomRows as mushrooms, i}
function create_each_block(ctx) {
	let row;
	let current;

	row = new Row({
			props: {
				mushrooms: /*mushrooms*/ ctx[7],
				height: /*height*/ ctx[2],
				slideRight: /*i*/ ctx[9] % 2
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(row.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(row, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const row_changes = {};
			if (dirty & /*height*/ 4) row_changes.height = /*height*/ ctx[2];
			row.$set(row_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(row.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(row.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(row, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(5:4) {#each mushroomRows as mushrooms, i}",
		ctx
	});

	return block;
}

function create_fragment$1(ctx) {
	let div0;
	let t0;
	let div1;
	let t1;
	let current;
	let mounted;
	let dispose;
	let each_value = /*mushroomRows*/ ctx[3];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	const block = {
		c: function create() {
			div0 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t0 = space();
			div1 = element("div");
			t1 = text("Congrats, you are a mushroom.");
			attr_dev(div0, "class", "mcb372e550_marqueeland");
			add_location(div0, file$1, 0, 0, 0);
			attr_dev(div1, "class", "mcb372e550_needleModal");
			set_style(div1, "--in", /*$needleStore*/ ctx[1] ? "0" : "1");
			add_location(div1, file$1, 13, 0, 244);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div0, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div0, null);
			}

			/*div0_binding*/ ctx[4](div0);
			insert_dev(target, t0, anchor);
			insert_dev(target, div1, anchor);
			append_dev(div1, t1);
			current = true;

			if (!mounted) {
				dispose = listen_dev(div1, "click", /*click_handler*/ ctx[5], false, false, false);
				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*mushroomRows, height*/ 12) {
				each_value = /*mushroomRows*/ ctx[3];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div0, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}

			if (!current || dirty & /*$needleStore*/ 2) {
				set_style(div1, "--in", /*$needleStore*/ ctx[1] ? "0" : "1");
			}
		},
		i: function intro(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o: function outro(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div0);
			destroy_each(each_blocks, detaching);
			/*div0_binding*/ ctx[4](null);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(div1);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

const WIDTH = 30;
const HEIGHT = 30;

function instance$1($$self, $$props, $$invalidate) {
	let $needleStore;
	validate_store(needleFound, "needleStore");
	component_subscribe($$self, needleFound, $$value => $$invalidate(1, $needleStore = $$value));
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Scrolling", slots, []);
	const needle = randomInt(0, WIDTH * HEIGHT);

	const mushroomRows = Array.from({ length: HEIGHT }, (e, y) => {
		return Array.from({ length: WIDTH }, (e, x) => ({
			text: y * WIDTH + x === needle ? "fungi" : "mushroom",
			style: getStyle()
		}));
	});

	let containerEl;
	let height = 0;
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Scrolling> was created with unknown prop '${key}'`);
	});

	function div0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			containerEl = $$value;
			$$invalidate(0, containerEl);
		});
	}

	const click_handler = () => {
		if ($needleStore) {
			set_store_value(needleFound, $needleStore = false, $needleStore);
		}
	};

	$$self.$capture_state = () => ({
		css: css$1,
		randomInt,
		getStyle,
		needleStore: needleFound,
		Row,
		WIDTH,
		HEIGHT,
		needle,
		mushroomRows,
		containerEl,
		height,
		$needleStore
	});

	$$self.$inject_state = $$props => {
		if ("containerEl" in $$props) $$invalidate(0, containerEl = $$props.containerEl);
		if ("height" in $$props) $$invalidate(2, height = $$props.height);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*containerEl*/ 1) {
			if (containerEl) {
				$$invalidate(2, height = containerEl.getBoundingClientRect().height / HEIGHT);
			}
		}

		if ($$self.$$.dirty & /*$needleStore*/ 2) {
			console.log($needleStore);
		}
	};

	return [containerEl, $needleStore, height, mushroomRows, div0_binding, click_handler];
}

class Scrolling extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Scrolling",
			options,
			id: create_fragment$1.name
		});
	}
}

/* src\components\layout\layout.svelte generated by Svelte v3.37.0 */
const file = "src\\components\\layout\\layout.svelte";

function create_fragment(ctx) {
	let div;
	let scrolling;
	let current;
	scrolling = new Scrolling({ $$inline: true });

	const block = {
		c: function create() {
			div = element("div");
			create_component(scrolling.$$.fragment);
			attr_dev(div, "class", "mc805548d2_layout");
			add_location(div, file, 0, 0, 0);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			mount_component(scrolling, div, null);
			current = true;
		},
		p: noop,
		i: function intro(local) {
			if (current) return;
			transition_in(scrolling.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(scrolling.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			destroy_component(scrolling);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Layout", slots, []);
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Layout> was created with unknown prop '${key}'`);
	});

	$$self.$capture_state = () => ({ css: css$2, Scrolling });
	return [];
}

class Layout extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Layout",
			options,
			id: create_fragment.name
		});
	}
}

wrapTitle();

new Layout({
    target: document.body
});
