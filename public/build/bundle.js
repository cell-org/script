
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
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
    function set_store_value(store, ret, value) {
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
    function empty() {
        return text('');
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
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
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

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
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
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    let nuron = new Nuron({
      key: "m'/44'/60'/0'/0/0",
      workspace: "svelte",
      domain: {
        "address": "0xed30ea17c9a8b8b7fc4aea5b9f8f0f3af349bb0d",
        "chainId": 4,
        "name": "Payment"
      }
    });
    let receiver = writable();
    let puzzle = writable();
    let error = writable("");
    let Token = writable({
      cid:"bafkreidztp557q7fvbq5t34uat5l3vztkcjzavatrohclmigh5o7qxyrq4",
      owns: [],
      burned: [],
      payments: [],
      balance: [],
      senders: [],
      receivers: []
    });
    let metadata = derived(
      Token,
      ($Token, set) => {
        console.log("fetching");
        fetch(`https://ipfs.io/ipfs/${$Token.cid}`).then((res) => {
          return res.json()
        }).then((res) => {
          console.log("fetched", res);
          set(res);
        }).catch((e) => {
          console.log("ERROR", e.message);
          error.set("[IPFS] " + e.message);
        });
      }
    );
    let token = derived(
      Token,
      ($Token, set) => {
        console.log("UPDATED", $Token);
        if ($Token && $Token.cid) {
          nuron.token.create($Token).then((t) => {
            set(t);
          }).catch((e) => {
            console.log("ERROR", e.message);
            error.set("[NURON] " + e.message);
          });
        } else {
          error.set("cid required");
        }
      }
    );
    let gas = derived(
      [token, receiver, puzzle],
      ([$token, $receiver, $puzzle], set) => {
        if ($token && $token.body && $token.domain) {
          const c0 = new window.C0();
          const web3 = new Web3(window.ethereum);
          c0.init({ web3: web3 }).then(() => {
            c0.token.estimate([$token], [{ receiver: $receiver, puzzle: $puzzle }]).then((e) => {
              set(e);
              error.set("");
            }).catch((err) => {
              console.log(err);
              error.set(`[ERROR ${err.code}] ${err.message}`);
            });
          }).catch((e) => {
            error.set(e.message);
          });
        } else {
          set(0);
        }
      }
    );

    /* src/Relation.svelte generated by Svelte v3.48.0 */

    const { console: console_1$1 } = globals;
    const file$4 = "src/Relation.svelte";

    // (54:0) {#if resettable}
    function create_if_block_5(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "X";
    			attr_dev(button, "class", "svelte-13pqkqq");
    			add_location(button, file$4, 54, 0, 1626);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*reset*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(54:0) {#if resettable}",
    		ctx
    	});

    	return block;
    }

    // (57:0) {#if typeof index !== 'undefined'}
    function create_if_block_4(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "X";
    			attr_dev(button, "class", "svelte-13pqkqq");
    			add_location(button, file$4, 57, 0, 1703);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*remove*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(57:0) {#if typeof index !== 'undefined'}",
    		ctx
    	});

    	return block;
    }

    // (61:0) {#if payload.who}
    function create_if_block_2(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let input;
    	let t2;
    	let mounted;
    	let dispose;
    	let if_block = /*annotation_who*/ ctx[7] && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "who";
    			t1 = space();
    			div1 = element("div");
    			input = element("input");
    			t2 = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "col svelte-13pqkqq");
    			add_location(div0, file$4, 62, 2, 1791);
    			attr_dev(input, "placeholder", /*who*/ ctx[3]);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "svelte-13pqkqq");
    			add_location(input, file$4, 64, 4, 1847);
    			attr_dev(div1, "class", "flexible svelte-13pqkqq");
    			add_location(div1, file$4, 63, 2, 1820);
    			attr_dev(div2, "class", "row svelte-13pqkqq");
    			add_location(div2, file$4, 61, 0, 1771);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, input);
    			set_input_value(input, /*payload*/ ctx[0].who);
    			append_dev(div1, t2);
    			if (if_block) if_block.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[13]),
    					listen_dev(input, "change", /*refresh*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*who*/ 8) {
    				attr_dev(input, "placeholder", /*who*/ ctx[3]);
    			}

    			if (dirty & /*payload*/ 1 && input.value !== /*payload*/ ctx[0].who) {
    				set_input_value(input, /*payload*/ ctx[0].who);
    			}

    			if (/*annotation_who*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(61:0) {#if payload.who}",
    		ctx
    	});

    	return block;
    }

    // (66:4) {#if annotation_who}
    function create_if_block_3(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*annotation_who*/ ctx[7]);
    			attr_dev(div, "class", "annotation svelte-13pqkqq");
    			add_location(div, file$4, 66, 4, 1959);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*annotation_who*/ 128) set_data_dev(t, /*annotation_who*/ ctx[7]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(66:4) {#if annotation_who}",
    		ctx
    	});

    	return block;
    }

    // (76:4) {#if annotation_what}
    function create_if_block_1$1(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*annotation_what*/ ctx[6]);
    			attr_dev(div, "class", "annotation svelte-13pqkqq");
    			add_location(div, file$4, 76, 4, 2230);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*annotation_what*/ 64) set_data_dev(t, /*annotation_what*/ ctx[6]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(76:4) {#if annotation_what}",
    		ctx
    	});

    	return block;
    }

    // (85:4) {#if annotation_where}
    function create_if_block$2(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*annotation_where*/ ctx[8]);
    			attr_dev(div, "class", "annotation svelte-13pqkqq");
    			add_location(div, file$4, 85, 4, 2500);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*annotation_where*/ 256) set_data_dev(t, /*annotation_where*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(85:4) {#if annotation_where}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div7;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let div3;
    	let div1;
    	let t4;
    	let div2;
    	let input0;
    	let t5;
    	let t6;
    	let div6;
    	let div4;
    	let t8;
    	let div5;
    	let input1;
    	let t9;
    	let mounted;
    	let dispose;
    	let if_block0 = /*resettable*/ ctx[5] && create_if_block_5(ctx);
    	let if_block1 = typeof /*index*/ ctx[4] !== 'undefined' && create_if_block_4(ctx);
    	let if_block2 = /*payload*/ ctx[0].who && create_if_block_2(ctx);
    	let if_block3 = /*annotation_what*/ ctx[6] && create_if_block_1$1(ctx);
    	let if_block4 = /*annotation_where*/ ctx[8] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			div3 = element("div");
    			div1 = element("div");
    			div1.textContent = "what";
    			t4 = space();
    			div2 = element("div");
    			input0 = element("input");
    			t5 = space();
    			if (if_block3) if_block3.c();
    			t6 = space();
    			div6 = element("div");
    			div4 = element("div");
    			div4.textContent = "where";
    			t8 = space();
    			div5 = element("div");
    			input1 = element("input");
    			t9 = space();
    			if (if_block4) if_block4.c();
    			attr_dev(div0, "class", "header svelte-13pqkqq");
    			add_location(div0, file$4, 52, 0, 1588);
    			attr_dev(div1, "class", "col svelte-13pqkqq");
    			add_location(div1, file$4, 72, 2, 2058);
    			attr_dev(input0, "placeholder", /*what*/ ctx[1]);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "svelte-13pqkqq");
    			add_location(input0, file$4, 74, 4, 2115);
    			attr_dev(div2, "class", "flexible svelte-13pqkqq");
    			add_location(div2, file$4, 73, 2, 2088);
    			attr_dev(div3, "class", "row svelte-13pqkqq");
    			add_location(div3, file$4, 71, 0, 2038);
    			attr_dev(div4, "class", "col svelte-13pqkqq");
    			add_location(div4, file$4, 81, 2, 2324);
    			attr_dev(input1, "placeholder", /*where*/ ctx[2]);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "svelte-13pqkqq");
    			add_location(input1, file$4, 83, 4, 2382);
    			attr_dev(div5, "class", "flexible svelte-13pqkqq");
    			add_location(div5, file$4, 82, 2, 2355);
    			attr_dev(div6, "class", "row svelte-13pqkqq");
    			add_location(div6, file$4, 80, 0, 2304);
    			attr_dev(div7, "class", "component svelte-13pqkqq");
    			add_location(div7, file$4, 51, 0, 1564);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div0, t0);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div7, t1);
    			if (if_block2) if_block2.m(div7, null);
    			append_dev(div7, t2);
    			append_dev(div7, div3);
    			append_dev(div3, div1);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, input0);
    			set_input_value(input0, /*payload*/ ctx[0].what);
    			append_dev(div2, t5);
    			if (if_block3) if_block3.m(div2, null);
    			append_dev(div7, t6);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div6, t8);
    			append_dev(div6, div5);
    			append_dev(div5, input1);
    			set_input_value(input1, /*payload*/ ctx[0].where);
    			append_dev(div5, t9);
    			if (if_block4) if_block4.m(div5, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[14]),
    					listen_dev(input0, "change", /*refresh*/ ctx[9], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[15]),
    					listen_dev(input1, "change", /*refresh*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*resettable*/ ctx[5]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(div0, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (typeof /*index*/ ctx[4] !== 'undefined') {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_4(ctx);
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*payload*/ ctx[0].who) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_2(ctx);
    					if_block2.c();
    					if_block2.m(div7, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*what*/ 2) {
    				attr_dev(input0, "placeholder", /*what*/ ctx[1]);
    			}

    			if (dirty & /*payload*/ 1 && input0.value !== /*payload*/ ctx[0].what) {
    				set_input_value(input0, /*payload*/ ctx[0].what);
    			}

    			if (/*annotation_what*/ ctx[6]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_1$1(ctx);
    					if_block3.c();
    					if_block3.m(div2, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty & /*where*/ 4) {
    				attr_dev(input1, "placeholder", /*where*/ ctx[2]);
    			}

    			if (dirty & /*payload*/ 1 && input1.value !== /*payload*/ ctx[0].where) {
    				set_input_value(input1, /*payload*/ ctx[0].where);
    			}

    			if (/*annotation_where*/ ctx[8]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block$2(ctx);
    					if_block4.c();
    					if_block4.m(div5, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $Token;
    	validate_store(Token, 'Token');
    	component_subscribe($$self, Token, $$value => $$invalidate(16, $Token = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Relation', slots, []);
    	let { payload = {} } = $$props;
    	let { what } = $$props;
    	let { where } = $$props;
    	let { who } = $$props;
    	let { index } = $$props;
    	let { type } = $$props;
    	let { resettable } = $$props;
    	const dispatch = createEventDispatcher();
    	let annotation_what;
    	let annotation_who;
    	let annotation_where;

    	const refresh = () => {
    		console.log("refresh");
    		dispatch('refresh');
    	};

    	const remove = () => {
    		set_store_value(
    			Token,
    			$Token[type] = $Token[type].filter((x, i) => {
    				return i !== index;
    			}),
    			$Token
    		);
    	};

    	const reset = () => {
    		delete $Token[type];
    		Token.set($Token);
    	};

    	const writable_props = ['payload', 'what', 'where', 'who', 'index', 'type', 'resettable'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Relation> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		payload.who = this.value;
    		$$invalidate(0, payload);
    	}

    	function input0_input_handler() {
    		payload.what = this.value;
    		$$invalidate(0, payload);
    	}

    	function input1_input_handler() {
    		payload.where = this.value;
    		$$invalidate(0, payload);
    	}

    	$$self.$$set = $$props => {
    		if ('payload' in $$props) $$invalidate(0, payload = $$props.payload);
    		if ('what' in $$props) $$invalidate(1, what = $$props.what);
    		if ('where' in $$props) $$invalidate(2, where = $$props.where);
    		if ('who' in $$props) $$invalidate(3, who = $$props.who);
    		if ('index' in $$props) $$invalidate(4, index = $$props.index);
    		if ('type' in $$props) $$invalidate(12, type = $$props.type);
    		if ('resettable' in $$props) $$invalidate(5, resettable = $$props.resettable);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Token,
    		payload,
    		what,
    		where,
    		who,
    		index,
    		type,
    		resettable,
    		dispatch,
    		annotation_what,
    		annotation_who,
    		annotation_where,
    		refresh,
    		remove,
    		reset,
    		$Token
    	});

    	$$self.$inject_state = $$props => {
    		if ('payload' in $$props) $$invalidate(0, payload = $$props.payload);
    		if ('what' in $$props) $$invalidate(1, what = $$props.what);
    		if ('where' in $$props) $$invalidate(2, where = $$props.where);
    		if ('who' in $$props) $$invalidate(3, who = $$props.who);
    		if ('index' in $$props) $$invalidate(4, index = $$props.index);
    		if ('type' in $$props) $$invalidate(12, type = $$props.type);
    		if ('resettable' in $$props) $$invalidate(5, resettable = $$props.resettable);
    		if ('annotation_what' in $$props) $$invalidate(6, annotation_what = $$props.annotation_what);
    		if ('annotation_who' in $$props) $$invalidate(7, annotation_who = $$props.annotation_who);
    		if ('annotation_where' in $$props) $$invalidate(8, annotation_where = $$props.annotation_where);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*type, payload*/ 4097) {
    			if (type === "royalty") {
    				let w = payload.what ? parseInt(payload.what) : 0;
    				$$invalidate(6, annotation_what = `${100 * w / 10 ** 6} %`);
    				$$invalidate(8, annotation_where = "royalty receiver address");
    			} else if (type === "payments") {
    				let w = payload.what ? parseInt(payload.what) : 0;
    				$$invalidate(6, annotation_what = `${100 * w / 10 ** 6} %`);
    				$$invalidate(8, annotation_where = "mint revenue split receiver address");
    			} else if (type === "owns") {
    				$$invalidate(6, annotation_what = `ERC721 tokenId`);
    				$$invalidate(8, annotation_where = "ERC721 contract address (leave empty if same contract)");
    				$$invalidate(7, annotation_who = 'enter "sender" or "receiver"');
    			} else if (type === "burned") {
    				$$invalidate(6, annotation_what = `ERC721 tokenId`);
    				$$invalidate(8, annotation_where = "ERC721 contract address (leave empty if same contract)");
    				$$invalidate(7, annotation_who = 'enter "sender" or "receiver"');
    			} else if (type === "balance") {
    				$$invalidate(6, annotation_what = `minimum ERC721/ERC20 balance`);
    				$$invalidate(8, annotation_where = "ERC721/ERC20 contract address (leave empty if same contract)");
    				$$invalidate(7, annotation_who = 'enter "sender" or "receiver"');
    			}
    		}
    	};

    	return [
    		payload,
    		what,
    		where,
    		who,
    		index,
    		resettable,
    		annotation_what,
    		annotation_who,
    		annotation_where,
    		refresh,
    		remove,
    		reset,
    		type,
    		input_input_handler,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Relation extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			payload: 0,
    			what: 1,
    			where: 2,
    			who: 3,
    			index: 4,
    			type: 12,
    			resettable: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Relation",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*what*/ ctx[1] === undefined && !('what' in props)) {
    			console_1$1.warn("<Relation> was created without expected prop 'what'");
    		}

    		if (/*where*/ ctx[2] === undefined && !('where' in props)) {
    			console_1$1.warn("<Relation> was created without expected prop 'where'");
    		}

    		if (/*who*/ ctx[3] === undefined && !('who' in props)) {
    			console_1$1.warn("<Relation> was created without expected prop 'who'");
    		}

    		if (/*index*/ ctx[4] === undefined && !('index' in props)) {
    			console_1$1.warn("<Relation> was created without expected prop 'index'");
    		}

    		if (/*type*/ ctx[12] === undefined && !('type' in props)) {
    			console_1$1.warn("<Relation> was created without expected prop 'type'");
    		}

    		if (/*resettable*/ ctx[5] === undefined && !('resettable' in props)) {
    			console_1$1.warn("<Relation> was created without expected prop 'resettable'");
    		}
    	}

    	get payload() {
    		throw new Error("<Relation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set payload(value) {
    		throw new Error("<Relation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get what() {
    		throw new Error("<Relation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set what(value) {
    		throw new Error("<Relation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get where() {
    		throw new Error("<Relation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set where(value) {
    		throw new Error("<Relation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get who() {
    		throw new Error("<Relation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set who(value) {
    		throw new Error("<Relation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get index() {
    		throw new Error("<Relation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<Relation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Relation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Relation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get resettable() {
    		throw new Error("<Relation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set resettable(value) {
    		throw new Error("<Relation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/List.svelte generated by Svelte v3.48.0 */
    const file$3 = "src/List.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			textarea = element("textarea");
    			attr_dev(textarea, "placeholder", "line separated addresses");
    			attr_dev(textarea, "class", "svelte-1hnug1o");
    			add_location(textarea, file$3, 13, 2, 257);
    			attr_dev(div, "class", "component svelte-1hnug1o");
    			add_location(div, file$3, 12, 0, 231);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, textarea);
    			set_input_value(textarea, /*listStr*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[3]),
    					listen_dev(textarea, "change", /*refresh*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*listStr*/ 1) {
    				set_input_value(textarea, /*listStr*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $Token;
    	validate_store(Token, 'Token');
    	component_subscribe($$self, Token, $$value => $$invalidate(4, $Token = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('List', slots, []);
    	let listStr = "";
    	let { type } = $$props;

    	const refresh = () => {
    		set_store_value(
    			Token,
    			$Token[type] = listStr.split("\n").map(x => {
    				return x.trim();
    			}).filter(x => {
    				return x != "";
    			}),
    			$Token
    		);
    	};

    	const writable_props = ['type'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<List> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		listStr = this.value;
    		$$invalidate(0, listStr);
    	}

    	$$self.$$set = $$props => {
    		if ('type' in $$props) $$invalidate(2, type = $$props.type);
    	};

    	$$self.$capture_state = () => ({ Token, listStr, type, refresh, $Token });

    	$$self.$inject_state = $$props => {
    		if ('listStr' in $$props) $$invalidate(0, listStr = $$props.listStr);
    		if ('type' in $$props) $$invalidate(2, type = $$props.type);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [listStr, refresh, type, textarea_input_handler];
    }

    class List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { type: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "List",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*type*/ ctx[2] === undefined && !('type' in props)) {
    			console.warn("<List> was created without expected prop 'type'");
    		}
    	}

    	get type() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Meta.svelte generated by Svelte v3.48.0 */

    const { Object: Object_1 } = globals;
    const file$2 = "src/Meta.svelte";

    // (16:0) {#if meta}
    function create_if_block$1(ctx) {
    	let div2;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let h1;
    	let t1_value = /*meta*/ ctx[0].name + "";
    	let t1;
    	let t2;
    	let div0;
    	let t3_value = /*meta*/ ctx[0].description + "";
    	let t3;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			div0 = element("div");
    			t3 = text(t3_value);
    			attr_dev(img, "alt", "");
    			if (!src_url_equal(img.src, img_src_value = "https://ipfs.io/ipfs/" + /*meta*/ ctx[0].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-1jupi58");
    			add_location(img, file$2, 17, 2, 380);
    			attr_dev(h1, "class", "svelte-1jupi58");
    			add_location(h1, file$2, 19, 4, 457);
    			attr_dev(div0, "class", "description");
    			add_location(div0, file$2, 20, 4, 482);
    			attr_dev(div1, "class", "col svelte-1jupi58");
    			add_location(div1, file$2, 18, 2, 435);
    			attr_dev(div2, "class", "card svelte-1jupi58");
    			add_location(div2, file$2, 16, 0, 359);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, img);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			append_dev(h1, t1);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*meta*/ 1 && !src_url_equal(img.src, img_src_value = "https://ipfs.io/ipfs/" + /*meta*/ ctx[0].image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*meta*/ 1 && t1_value !== (t1_value = /*meta*/ ctx[0].name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*meta*/ 1 && t3_value !== (t3_value = /*meta*/ ctx[0].description + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(16:0) {#if meta}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let if_block_anchor;
    	let if_block = /*meta*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*meta*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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
    	let $metadata;
    	validate_store(metadata, 'metadata');
    	component_subscribe($$self, metadata, $$value => $$invalidate(1, $metadata = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Meta', slots, []);
    	let meta;
    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Meta> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ metadata, meta, $metadata });

    	$$self.$inject_state = $$props => {
    		if ('meta' in $$props) $$invalidate(0, meta = $$props.meta);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$metadata*/ 2) {
    			{
    				if ($metadata && Object.keys($metadata)) {
    					$$invalidate(0, meta = {
    						name: $metadata.name ? $metadata.name : "",
    						description: $metadata.description ? $metadata.description : "",
    						image: $metadata.image.replace("ipfs://", "")
    					});
    				} else {
    					$$invalidate(0, meta = null);
    				}
    			}
    		}
    	};

    	return [meta, $metadata];
    }

    class Meta extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Meta",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Cell.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file$1 = "src/Cell.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[35] = list[i];
    	child_ctx[37] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[38] = list[i];
    	child_ctx[37] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	child_ctx[37] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[42] = list[i];
    	child_ctx[37] = i;
    	return child_ctx;
    }

    // (146:6) {#if $Token.royalty}
    function create_if_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Relation;

    	function switch_props(ctx) {
    		return {
    			props: {
    				resettable: "true",
    				type: "royalty",
    				payload: /*$Token*/ ctx[2].royalty,
    				what: "royalty portion (number between 1 and 1,000,000)",
    				where: "royalty receiver address"
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("refresh", /*handleMessage*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty[0] & /*$Token*/ 4) switch_instance_changes.payload = /*$Token*/ ctx[2].royalty;

    			if (switch_value !== (switch_value = Relation)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("refresh", /*handleMessage*/ ctx[15]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(146:6) {#if $Token.royalty}",
    		ctx
    	});

    	return block;
    }

    // (157:6) {#each $Token.payments as payment, i}
    function create_each_block_3(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Relation;

    	function switch_props(ctx) {
    		return {
    			props: {
    				type: "payments",
    				index: /*i*/ ctx[37],
    				payload: /*payment*/ ctx[42],
    				what: "split portion (number between 1 and 1,000,000)",
    				where: "mint revenue split receiver address"
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("refresh", /*handleMessage*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty[0] & /*$Token*/ 4) switch_instance_changes.payload = /*payment*/ ctx[42];

    			if (switch_value !== (switch_value = Relation)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("refresh", /*handleMessage*/ ctx[15]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(157:6) {#each $Token.payments as payment, i}",
    		ctx
    	});

    	return block;
    }

    // (168:6) {#each $Token.owns as own, i}
    function create_each_block_2(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Relation;

    	function switch_props(ctx) {
    		return {
    			props: {
    				type: "owns",
    				index: /*i*/ ctx[37],
    				payload: /*own*/ ctx[40],
    				what: "The NFT tokenId",
    				who: "'sender' or 'receiver'",
    				where: "NFT contract address (leave empty if same collection)"
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("refresh", /*handleMessage*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty[0] & /*$Token*/ 4) switch_instance_changes.payload = /*own*/ ctx[40];

    			if (switch_value !== (switch_value = Relation)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("refresh", /*handleMessage*/ ctx[15]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(168:6) {#each $Token.owns as own, i}",
    		ctx
    	});

    	return block;
    }

    // (179:6) {#each $Token.burned as burn, i}
    function create_each_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Relation;

    	function switch_props(ctx) {
    		return {
    			props: {
    				type: "burned",
    				index: /*i*/ ctx[37],
    				payload: /*burn*/ ctx[38],
    				what: "The burned NFT tokenId",
    				who: "'sender' or 'receiver'",
    				where: "NFT contract address (leave empty if same collection)"
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("refresh", /*handleMessage*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty[0] & /*$Token*/ 4) switch_instance_changes.payload = /*burn*/ ctx[38];

    			if (switch_value !== (switch_value = Relation)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("refresh", /*handleMessage*/ ctx[15]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(179:6) {#each $Token.burned as burn, i}",
    		ctx
    	});

    	return block;
    }

    // (190:6) {#each $Token.balance as b, i}
    function create_each_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Relation;

    	function switch_props(ctx) {
    		return {
    			props: {
    				type: "balance",
    				index: /*i*/ ctx[37],
    				payload: /*b*/ ctx[35],
    				what: "The minimum balance required",
    				who: "'sender' or 'receiver'",
    				where: "The target NFT or ERC20 contract address"
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("refresh", /*handleMessage*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty[0] & /*$Token*/ 4) switch_instance_changes.payload = /*b*/ ctx[35];

    			if (switch_value !== (switch_value = Relation)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("refresh", /*handleMessage*/ ctx[15]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(190:6) {#each $Token.balance as b, i}",
    		ctx
    	});

    	return block;
    }

    // (199:2) {#if $Token.puzzle}
    function create_if_block(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "enter the hash puzzle solution");
    			attr_dev(input, "class", "svelte-1jliykm");
    			add_location(input, file$1, 199, 2, 7159);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*$puzzle*/ ctx[10]);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[31]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$puzzle*/ 1024 && input.value !== /*$puzzle*/ ctx[10]) {
    				set_input_value(input, /*$puzzle*/ ctx[10]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(199:2) {#if $Token.puzzle}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let nav;
    	let header;
    	let t0;
    	let t1;
    	let table;
    	let tr0;
    	let td0;
    	let a;
    	let img;
    	let img_src_value;
    	let t2;
    	let td1;
    	let t3;
    	let t4;
    	let td2;
    	let t5;
    	let t6;
    	let td3;
    	let t7;
    	let t8;
    	let t9;
    	let td4;
    	let t10;
    	let t11;
    	let td5;
    	let t12;
    	let t13;
    	let tr1;
    	let td6;
    	let t15;
    	let td7;
    	let t17;
    	let td8;
    	let t19;
    	let td9;
    	let t21;
    	let td10;
    	let t23;
    	let td11;
    	let t25;
    	let div44;
    	let div41;
    	let div1;
    	let div0;
    	let t27;
    	let input0;
    	let t28;
    	let div3;
    	let div2;
    	let t30;
    	let input1;
    	let t31;
    	let div5;
    	let div4;
    	let t33;
    	let input2;
    	let t34;
    	let div9;
    	let div6;
    	let t36;
    	let div8;
    	let input3;
    	let t37;
    	let div7;
    	let t38;
    	let t39;
    	let div13;
    	let div10;
    	let t41;
    	let div12;
    	let input4;
    	let t42;
    	let div11;
    	let t43;
    	let t44;
    	let div17;
    	let div14;
    	let t46;
    	let div16;
    	let input5;
    	let t47;
    	let div15;
    	let t48;
    	let t49;
    	let div19;
    	let div18;
    	let t51;
    	let input6;
    	let t52;
    	let div22;
    	let div20;
    	let t54;
    	let div21;
    	let switch_instance0;
    	let t55;
    	let div25;
    	let div23;
    	let t57;
    	let div24;
    	let switch_instance1;
    	let t58;
    	let div28;
    	let div26;
    	let t60;
    	let div27;
    	let button0;
    	let t62;
    	let t63;
    	let div31;
    	let div29;
    	let t65;
    	let div30;
    	let button1;
    	let t67;
    	let t68;
    	let div34;
    	let div32;
    	let t70;
    	let div33;
    	let button2;
    	let t72;
    	let t73;
    	let div37;
    	let div35;
    	let t75;
    	let div36;
    	let button3;
    	let t77;
    	let t78;
    	let div40;
    	let div38;
    	let t80;
    	let div39;
    	let button4;
    	let t82;
    	let t83;
    	let div43;
    	let meta;
    	let t84;
    	let div42;
    	let t85;
    	let input7;
    	let t86;
    	let button5;
    	let t88;
    	let pre;
    	let t89;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = List;

    	function switch_props(ctx) {
    		return {
    			props: { type: "senders" },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance0 = new switch_value(switch_props());
    		switch_instance0.$on("refresh", /*handleMessage*/ ctx[15]);
    	}

    	var switch_value_1 = List;

    	function switch_props_1(ctx) {
    		return {
    			props: { type: "receivers" },
    			$$inline: true
    		};
    	}

    	if (switch_value_1) {
    		switch_instance1 = new switch_value_1(switch_props_1());
    		switch_instance1.$on("refresh", /*handleMessage*/ ctx[15]);
    	}

    	let if_block0 = /*$Token*/ ctx[2].royalty && create_if_block_1(ctx);
    	let each_value_3 = /*$Token*/ ctx[2].payments;
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const out = i => transition_out(each_blocks_3[i], 1, 1, () => {
    		each_blocks_3[i] = null;
    	});

    	let each_value_2 = /*$Token*/ ctx[2].owns;
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out_1 = i => transition_out(each_blocks_2[i], 1, 1, () => {
    		each_blocks_2[i] = null;
    	});

    	let each_value_1 = /*$Token*/ ctx[2].burned;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out_2 = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*$Token*/ ctx[2].balance;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out_3 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	meta = new Meta({ $$inline: true });
    	let if_block1 = /*$Token*/ ctx[2].puzzle && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			header = element("header");
    			t0 = text(/*$error*/ ctx[12]);
    			t1 = space();
    			table = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			a = element("a");
    			img = element("img");
    			t2 = space();
    			td1 = element("td");
    			t3 = text(/*$gas*/ ctx[3]);
    			t4 = space();
    			td2 = element("td");
    			t5 = text(/*rate*/ ctx[0]);
    			t6 = space();
    			td3 = element("td");
    			t7 = text("$");
    			t8 = text(/*price*/ ctx[1]);
    			t9 = space();
    			td4 = element("td");
    			t10 = text(/*ethCostStr*/ ctx[9]);
    			t11 = space();
    			td5 = element("td");
    			t12 = text(/*usdCost*/ ctx[8]);
    			t13 = space();
    			tr1 = element("tr");
    			td6 = element("td");
    			td6.textContent = "cell script";
    			t15 = space();
    			td7 = element("td");
    			td7.textContent = "gas usage";
    			t17 = space();
    			td8 = element("td");
    			td8.textContent = "gas rate";
    			t19 = space();
    			td9 = element("td");
    			td9.textContent = "eth price";
    			t21 = space();
    			td10 = element("td");
    			td10.textContent = "mint cost (ETH)";
    			t23 = space();
    			td11 = element("td");
    			td11.textContent = "mint cost (USD)";
    			t25 = space();
    			div44 = element("div");
    			div41 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "cid";
    			t27 = space();
    			input0 = element("input");
    			t28 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div2.textContent = "sender";
    			t30 = space();
    			input1 = element("input");
    			t31 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div4.textContent = "receiver";
    			t33 = space();
    			input2 = element("input");
    			t34 = space();
    			div9 = element("div");
    			div6 = element("div");
    			div6.textContent = "value";
    			t36 = space();
    			div8 = element("div");
    			input3 = element("input");
    			t37 = space();
    			div7 = element("div");
    			t38 = text(/*valueInEth*/ ctx[7]);
    			t39 = space();
    			div13 = element("div");
    			div10 = element("div");
    			div10.textContent = "start";
    			t41 = space();
    			div12 = element("div");
    			input4 = element("input");
    			t42 = space();
    			div11 = element("div");
    			t43 = text(/*startInDate*/ ctx[6]);
    			t44 = space();
    			div17 = element("div");
    			div14 = element("div");
    			div14.textContent = "end";
    			t46 = space();
    			div16 = element("div");
    			input5 = element("input");
    			t47 = space();
    			div15 = element("div");
    			t48 = text(/*endInDate*/ ctx[5]);
    			t49 = space();
    			div19 = element("div");
    			div18 = element("div");
    			div18.textContent = "hash puzzle";
    			t51 = space();
    			input6 = element("input");
    			t52 = space();
    			div22 = element("div");
    			div20 = element("div");
    			div20.textContent = "Senders Invite List";
    			t54 = space();
    			div21 = element("div");
    			if (switch_instance0) create_component(switch_instance0.$$.fragment);
    			t55 = space();
    			div25 = element("div");
    			div23 = element("div");
    			div23.textContent = "Receivers Invite List";
    			t57 = space();
    			div24 = element("div");
    			if (switch_instance1) create_component(switch_instance1.$$.fragment);
    			t58 = space();
    			div28 = element("div");
    			div26 = element("div");
    			div26.textContent = "EIP-2981 Royalty";
    			t60 = space();
    			div27 = element("div");
    			button0 = element("button");
    			button0.textContent = "Set royalty";
    			t62 = space();
    			if (if_block0) if_block0.c();
    			t63 = space();
    			div31 = element("div");
    			div29 = element("div");
    			div29.textContent = "Payments split";
    			t65 = space();
    			div30 = element("div");
    			button1 = element("button");
    			button1.textContent = "+ add";
    			t67 = space();

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t68 = space();
    			div34 = element("div");
    			div32 = element("div");
    			div32.textContent = "Ownership condition";
    			t70 = space();
    			div33 = element("div");
    			button2 = element("button");
    			button2.textContent = "+ add";
    			t72 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t73 = space();
    			div37 = element("div");
    			div35 = element("div");
    			div35.textContent = "Burnership condition";
    			t75 = space();
    			div36 = element("div");
    			button3 = element("button");
    			button3.textContent = "+ sdd";
    			t77 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t78 = space();
    			div40 = element("div");
    			div38 = element("div");
    			div38.textContent = "Balance condition";
    			t80 = space();
    			div39 = element("div");
    			button4 = element("button");
    			button4.textContent = "+ add";
    			t82 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t83 = space();
    			div43 = element("div");
    			create_component(meta.$$.fragment);
    			t84 = space();
    			div42 = element("div");
    			if (if_block1) if_block1.c();
    			t85 = space();
    			input7 = element("input");
    			t86 = space();
    			button5 = element("button");
    			button5.textContent = "Mint";
    			t88 = space();
    			pre = element("pre");
    			t89 = text(/*tokenStr*/ ctx[4]);
    			attr_dev(header, "class", "svelte-1jliykm");
    			add_location(header, file$1, 68, 0, 2254);
    			attr_dev(img, "alt", "");
    			if (!src_url_equal(img.src, img_src_value = "/cell.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "beat logo svelte-1jliykm");
    			add_location(img, file$1, 71, 20, 2315);
    			attr_dev(a, "href", "/");
    			add_location(a, file$1, 71, 8, 2303);
    			attr_dev(td0, "class", "svelte-1jliykm");
    			add_location(td0, file$1, 71, 4, 2299);
    			attr_dev(td1, "class", "large svelte-1jliykm");
    			add_location(td1, file$1, 72, 4, 2375);
    			attr_dev(td2, "class", "large svelte-1jliykm");
    			add_location(td2, file$1, 73, 4, 2409);
    			attr_dev(td3, "class", "large svelte-1jliykm");
    			add_location(td3, file$1, 74, 4, 2443);
    			attr_dev(td4, "class", "large svelte-1jliykm");
    			add_location(td4, file$1, 75, 4, 2479);
    			attr_dev(td5, "class", "large svelte-1jliykm");
    			add_location(td5, file$1, 76, 4, 2519);
    			add_location(tr0, file$1, 70, 2, 2290);
    			attr_dev(td6, "class", "svelte-1jliykm");
    			add_location(td6, file$1, 79, 4, 2571);
    			attr_dev(td7, "class", "svelte-1jliykm");
    			add_location(td7, file$1, 80, 4, 2596);
    			attr_dev(td8, "class", "svelte-1jliykm");
    			add_location(td8, file$1, 81, 4, 2619);
    			attr_dev(td9, "class", "svelte-1jliykm");
    			add_location(td9, file$1, 82, 4, 2641);
    			attr_dev(td10, "class", "svelte-1jliykm");
    			add_location(td10, file$1, 83, 4, 2664);
    			attr_dev(td11, "class", "svelte-1jliykm");
    			add_location(td11, file$1, 84, 4, 2693);
    			add_location(tr1, file$1, 78, 2, 2562);
    			attr_dev(table, "class", "svelte-1jliykm");
    			add_location(table, file$1, 69, 0, 2280);
    			attr_dev(nav, "class", "svelte-1jliykm");
    			add_location(nav, file$1, 67, 0, 2248);
    			attr_dev(div0, "class", "col svelte-1jliykm");
    			add_location(div0, file$1, 91, 4, 2809);
    			attr_dev(input0, "placeholder", "metadata IPFS cid");
    			attr_dev(input0, "class", "flexible svelte-1jliykm");
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$1, 92, 4, 2840);
    			attr_dev(div1, "class", "row svelte-1jliykm");
    			add_location(div1, file$1, 90, 2, 2787);
    			attr_dev(div2, "class", "col svelte-1jliykm");
    			add_location(div2, file$1, 95, 4, 2966);
    			attr_dev(input1, "placeholder", "single authorized sender address");
    			attr_dev(input1, "class", "flexible svelte-1jliykm");
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$1, 96, 4, 3000);
    			attr_dev(div3, "class", "row svelte-1jliykm");
    			add_location(div3, file$1, 94, 2, 2944);
    			attr_dev(div4, "class", "col svelte-1jliykm");
    			add_location(div4, file$1, 99, 4, 3144);
    			attr_dev(input2, "placeholder", "single authorized receiver address");
    			attr_dev(input2, "class", "flexible svelte-1jliykm");
    			attr_dev(input2, "type", "text");
    			add_location(input2, file$1, 100, 4, 3180);
    			attr_dev(div5, "class", "row svelte-1jliykm");
    			add_location(div5, file$1, 98, 2, 3122);
    			attr_dev(div6, "class", "col svelte-1jliykm");
    			add_location(div6, file$1, 103, 4, 3328);
    			attr_dev(input3, "placeholder", "amount of wei required for minting");
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "class", "svelte-1jliykm");
    			add_location(input3, file$1, 105, 6, 3390);
    			attr_dev(div7, "class", "annotation svelte-1jliykm");
    			add_location(div7, file$1, 106, 6, 3493);
    			attr_dev(div8, "class", "flexible svelte-1jliykm");
    			add_location(div8, file$1, 104, 4, 3361);
    			attr_dev(div9, "class", "row svelte-1jliykm");
    			add_location(div9, file$1, 102, 2, 3306);
    			attr_dev(div10, "class", "col svelte-1jliykm");
    			add_location(div10, file$1, 110, 4, 3580);
    			attr_dev(input4, "placeholder", "mint start time in Unix timestamp (in seconds)");
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "class", "svelte-1jliykm");
    			add_location(input4, file$1, 112, 6, 3642);
    			attr_dev(div11, "class", "annotation svelte-1jliykm");
    			add_location(div11, file$1, 113, 6, 3755);
    			attr_dev(div12, "class", "flexible svelte-1jliykm");
    			add_location(div12, file$1, 111, 4, 3613);
    			attr_dev(div13, "class", "row svelte-1jliykm");
    			add_location(div13, file$1, 109, 2, 3558);
    			attr_dev(div14, "class", "col svelte-1jliykm");
    			add_location(div14, file$1, 117, 4, 3843);
    			attr_dev(input5, "placeholder", "mint end time in Unix timestamp (in seconds)");
    			attr_dev(input5, "type", "text");
    			attr_dev(input5, "class", "svelte-1jliykm");
    			add_location(input5, file$1, 119, 6, 3903);
    			attr_dev(div15, "class", "annotation svelte-1jliykm");
    			add_location(div15, file$1, 120, 6, 4012);
    			attr_dev(div16, "class", "flexible svelte-1jliykm");
    			add_location(div16, file$1, 118, 4, 3874);
    			attr_dev(div17, "class", "row svelte-1jliykm");
    			add_location(div17, file$1, 116, 2, 3821);
    			attr_dev(div18, "class", "col svelte-1jliykm");
    			add_location(div18, file$1, 124, 4, 4098);
    			attr_dev(input6, "placeholder", "enter the desired solution to create a hash from");
    			attr_dev(input6, "class", "flexible svelte-1jliykm");
    			attr_dev(input6, "type", "text");
    			add_location(input6, file$1, 125, 4, 4137);
    			attr_dev(div19, "class", "row svelte-1jliykm");
    			add_location(div19, file$1, 123, 2, 4076);
    			attr_dev(div20, "class", "col svelte-1jliykm");
    			add_location(div20, file$1, 128, 4, 4297);
    			attr_dev(div21, "class", "senders flexible svelte-1jliykm");
    			add_location(div21, file$1, 129, 4, 4344);
    			attr_dev(div22, "class", "row svelte-1jliykm");
    			add_location(div22, file$1, 127, 2, 4275);
    			attr_dev(div23, "class", "col svelte-1jliykm");
    			add_location(div23, file$1, 134, 4, 4500);
    			attr_dev(div24, "class", "receivers flexible svelte-1jliykm");
    			add_location(div24, file$1, 135, 4, 4549);
    			attr_dev(div25, "class", "row svelte-1jliykm");
    			add_location(div25, file$1, 133, 2, 4478);
    			attr_dev(div26, "class", "col svelte-1jliykm");
    			add_location(div26, file$1, 140, 4, 4709);
    			attr_dev(button0, "class", "block svelte-1jliykm");
    			add_location(button0, file$1, 144, 6, 4794);
    			attr_dev(div27, "class", "flexible svelte-1jliykm");
    			add_location(div27, file$1, 143, 4, 4765);
    			attr_dev(div28, "class", "row svelte-1jliykm");
    			add_location(div28, file$1, 139, 2, 4687);
    			attr_dev(div29, "class", "col svelte-1jliykm");
    			add_location(div29, file$1, 151, 4, 5166);
    			attr_dev(button1, "class", "block svelte-1jliykm");
    			add_location(button1, file$1, 155, 6, 5249);
    			attr_dev(div30, "class", "flexible svelte-1jliykm");
    			add_location(div30, file$1, 154, 4, 5220);
    			attr_dev(div31, "class", "row svelte-1jliykm");
    			add_location(div31, file$1, 150, 2, 5144);
    			attr_dev(div32, "class", "col svelte-1jliykm");
    			add_location(div32, file$1, 162, 4, 5644);
    			attr_dev(button2, "class", "block svelte-1jliykm");
    			add_location(button2, file$1, 166, 6, 5732);
    			attr_dev(div33, "class", "flexible svelte-1jliykm");
    			add_location(div33, file$1, 165, 4, 5703);
    			attr_dev(div34, "class", "row svelte-1jliykm");
    			add_location(div34, file$1, 161, 2, 5622);
    			attr_dev(div35, "class", "col svelte-1jliykm");
    			add_location(div35, file$1, 173, 4, 6124);
    			attr_dev(button3, "class", "block svelte-1jliykm");
    			add_location(button3, file$1, 177, 6, 6213);
    			attr_dev(div36, "class", "flexible svelte-1jliykm");
    			add_location(div36, file$1, 176, 4, 6184);
    			attr_dev(div37, "class", "row svelte-1jliykm");
    			add_location(div37, file$1, 172, 2, 6102);
    			attr_dev(div38, "class", "col svelte-1jliykm");
    			add_location(div38, file$1, 184, 4, 6620);
    			attr_dev(button4, "class", "block svelte-1jliykm");
    			add_location(button4, file$1, 188, 6, 6706);
    			attr_dev(div39, "class", "flexible svelte-1jliykm");
    			add_location(div39, file$1, 187, 4, 6677);
    			attr_dev(div40, "class", "row svelte-1jliykm");
    			add_location(div40, file$1, 183, 2, 6598);
    			attr_dev(div41, "class", "side svelte-1jliykm");
    			add_location(div41, file$1, 89, 0, 2766);
    			attr_dev(input7, "type", "text");
    			attr_dev(input7, "placeholder", "mint receiver address");
    			attr_dev(input7, "class", "svelte-1jliykm");
    			add_location(input7, file$1, 201, 2, 7255);
    			attr_dev(button5, "class", "svelte-1jliykm");
    			add_location(button5, file$1, 202, 2, 7336);
    			attr_dev(div42, "class", "toolbar svelte-1jliykm");
    			add_location(div42, file$1, 197, 0, 7113);
    			attr_dev(pre, "class", "svelte-1jliykm");
    			add_location(pre, file$1, 204, 0, 7381);
    			attr_dev(div43, "class", "side svelte-1jliykm");
    			add_location(div43, file$1, 195, 0, 7085);
    			attr_dev(div44, "class", "container svelte-1jliykm");
    			add_location(div44, file$1, 88, 0, 2742);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, header);
    			append_dev(header, t0);
    			append_dev(nav, t1);
    			append_dev(nav, table);
    			append_dev(table, tr0);
    			append_dev(tr0, td0);
    			append_dev(td0, a);
    			append_dev(a, img);
    			append_dev(tr0, t2);
    			append_dev(tr0, td1);
    			append_dev(td1, t3);
    			append_dev(tr0, t4);
    			append_dev(tr0, td2);
    			append_dev(td2, t5);
    			append_dev(tr0, t6);
    			append_dev(tr0, td3);
    			append_dev(td3, t7);
    			append_dev(td3, t8);
    			append_dev(tr0, t9);
    			append_dev(tr0, td4);
    			append_dev(td4, t10);
    			append_dev(tr0, t11);
    			append_dev(tr0, td5);
    			append_dev(td5, t12);
    			append_dev(table, t13);
    			append_dev(table, tr1);
    			append_dev(tr1, td6);
    			append_dev(tr1, t15);
    			append_dev(tr1, td7);
    			append_dev(tr1, t17);
    			append_dev(tr1, td8);
    			append_dev(tr1, t19);
    			append_dev(tr1, td9);
    			append_dev(tr1, t21);
    			append_dev(tr1, td10);
    			append_dev(tr1, t23);
    			append_dev(tr1, td11);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, div44, anchor);
    			append_dev(div44, div41);
    			append_dev(div41, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t27);
    			append_dev(div1, input0);
    			set_input_value(input0, /*$Token*/ ctx[2].cid);
    			append_dev(div41, t28);
    			append_dev(div41, div3);
    			append_dev(div3, div2);
    			append_dev(div3, t30);
    			append_dev(div3, input1);
    			set_input_value(input1, /*$Token*/ ctx[2].sender);
    			append_dev(div41, t31);
    			append_dev(div41, div5);
    			append_dev(div5, div4);
    			append_dev(div5, t33);
    			append_dev(div5, input2);
    			set_input_value(input2, /*$Token*/ ctx[2].receiver);
    			append_dev(div41, t34);
    			append_dev(div41, div9);
    			append_dev(div9, div6);
    			append_dev(div9, t36);
    			append_dev(div9, div8);
    			append_dev(div8, input3);
    			set_input_value(input3, /*$Token*/ ctx[2].value);
    			append_dev(div8, t37);
    			append_dev(div8, div7);
    			append_dev(div7, t38);
    			append_dev(div41, t39);
    			append_dev(div41, div13);
    			append_dev(div13, div10);
    			append_dev(div13, t41);
    			append_dev(div13, div12);
    			append_dev(div12, input4);
    			set_input_value(input4, /*$Token*/ ctx[2].start);
    			append_dev(div12, t42);
    			append_dev(div12, div11);
    			append_dev(div11, t43);
    			append_dev(div41, t44);
    			append_dev(div41, div17);
    			append_dev(div17, div14);
    			append_dev(div17, t46);
    			append_dev(div17, div16);
    			append_dev(div16, input5);
    			set_input_value(input5, /*$Token*/ ctx[2].end);
    			append_dev(div16, t47);
    			append_dev(div16, div15);
    			append_dev(div15, t48);
    			append_dev(div41, t49);
    			append_dev(div41, div19);
    			append_dev(div19, div18);
    			append_dev(div19, t51);
    			append_dev(div19, input6);
    			set_input_value(input6, /*$Token*/ ctx[2].puzzle);
    			append_dev(div41, t52);
    			append_dev(div41, div22);
    			append_dev(div22, div20);
    			append_dev(div22, t54);
    			append_dev(div22, div21);

    			if (switch_instance0) {
    				mount_component(switch_instance0, div21, null);
    			}

    			append_dev(div41, t55);
    			append_dev(div41, div25);
    			append_dev(div25, div23);
    			append_dev(div25, t57);
    			append_dev(div25, div24);

    			if (switch_instance1) {
    				mount_component(switch_instance1, div24, null);
    			}

    			append_dev(div41, t58);
    			append_dev(div41, div28);
    			append_dev(div28, div26);
    			append_dev(div28, t60);
    			append_dev(div28, div27);
    			append_dev(div27, button0);
    			append_dev(div27, t62);
    			if (if_block0) if_block0.m(div27, null);
    			append_dev(div41, t63);
    			append_dev(div41, div31);
    			append_dev(div31, div29);
    			append_dev(div31, t65);
    			append_dev(div31, div30);
    			append_dev(div30, button1);
    			append_dev(div30, t67);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(div30, null);
    			}

    			append_dev(div41, t68);
    			append_dev(div41, div34);
    			append_dev(div34, div32);
    			append_dev(div34, t70);
    			append_dev(div34, div33);
    			append_dev(div33, button2);
    			append_dev(div33, t72);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div33, null);
    			}

    			append_dev(div41, t73);
    			append_dev(div41, div37);
    			append_dev(div37, div35);
    			append_dev(div37, t75);
    			append_dev(div37, div36);
    			append_dev(div36, button3);
    			append_dev(div36, t77);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div36, null);
    			}

    			append_dev(div41, t78);
    			append_dev(div41, div40);
    			append_dev(div40, div38);
    			append_dev(div40, t80);
    			append_dev(div40, div39);
    			append_dev(div39, button4);
    			append_dev(div39, t82);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div39, null);
    			}

    			append_dev(div44, t83);
    			append_dev(div44, div43);
    			mount_component(meta, div43, null);
    			append_dev(div43, t84);
    			append_dev(div43, div42);
    			if (if_block1) if_block1.m(div42, null);
    			append_dev(div42, t85);
    			append_dev(div42, input7);
    			set_input_value(input7, /*$receiver*/ ctx[11]);
    			append_dev(div42, t86);
    			append_dev(div42, button5);
    			append_dev(div43, t88);
    			append_dev(div43, pre);
    			append_dev(pre, t89);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[19]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[20]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[21]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[22]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[23]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[24]),
    					listen_dev(input6, "input", /*input6_input_handler*/ ctx[25]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[26], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[27], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[28], false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[29], false, false, false),
    					listen_dev(button4, "click", /*click_handler_4*/ ctx[30], false, false, false),
    					listen_dev(input7, "input", /*input7_input_handler*/ ctx[32]),
    					listen_dev(button5, "click", /*mint*/ ctx[16], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*$error*/ 4096) set_data_dev(t0, /*$error*/ ctx[12]);
    			if (!current || dirty[0] & /*$gas*/ 8) set_data_dev(t3, /*$gas*/ ctx[3]);
    			if (!current || dirty[0] & /*rate*/ 1) set_data_dev(t5, /*rate*/ ctx[0]);
    			if (!current || dirty[0] & /*price*/ 2) set_data_dev(t8, /*price*/ ctx[1]);
    			if (!current || dirty[0] & /*ethCostStr*/ 512) set_data_dev(t10, /*ethCostStr*/ ctx[9]);
    			if (!current || dirty[0] & /*usdCost*/ 256) set_data_dev(t12, /*usdCost*/ ctx[8]);

    			if (dirty[0] & /*$Token*/ 4 && input0.value !== /*$Token*/ ctx[2].cid) {
    				set_input_value(input0, /*$Token*/ ctx[2].cid);
    			}

    			if (dirty[0] & /*$Token*/ 4 && input1.value !== /*$Token*/ ctx[2].sender) {
    				set_input_value(input1, /*$Token*/ ctx[2].sender);
    			}

    			if (dirty[0] & /*$Token*/ 4 && input2.value !== /*$Token*/ ctx[2].receiver) {
    				set_input_value(input2, /*$Token*/ ctx[2].receiver);
    			}

    			if (dirty[0] & /*$Token*/ 4 && to_number(input3.value) !== /*$Token*/ ctx[2].value) {
    				set_input_value(input3, /*$Token*/ ctx[2].value);
    			}

    			if (!current || dirty[0] & /*valueInEth*/ 128) set_data_dev(t38, /*valueInEth*/ ctx[7]);

    			if (dirty[0] & /*$Token*/ 4 && input4.value !== /*$Token*/ ctx[2].start) {
    				set_input_value(input4, /*$Token*/ ctx[2].start);
    			}

    			if (!current || dirty[0] & /*startInDate*/ 64) set_data_dev(t43, /*startInDate*/ ctx[6]);

    			if (dirty[0] & /*$Token*/ 4 && input5.value !== /*$Token*/ ctx[2].end) {
    				set_input_value(input5, /*$Token*/ ctx[2].end);
    			}

    			if (!current || dirty[0] & /*endInDate*/ 32) set_data_dev(t48, /*endInDate*/ ctx[5]);

    			if (dirty[0] & /*$Token*/ 4 && input6.value !== /*$Token*/ ctx[2].puzzle) {
    				set_input_value(input6, /*$Token*/ ctx[2].puzzle);
    			}

    			if (switch_value !== (switch_value = List)) {
    				if (switch_instance0) {
    					group_outros();
    					const old_component = switch_instance0;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance0 = new switch_value(switch_props());
    					switch_instance0.$on("refresh", /*handleMessage*/ ctx[15]);
    					create_component(switch_instance0.$$.fragment);
    					transition_in(switch_instance0.$$.fragment, 1);
    					mount_component(switch_instance0, div21, null);
    				} else {
    					switch_instance0 = null;
    				}
    			}

    			if (switch_value_1 !== (switch_value_1 = List)) {
    				if (switch_instance1) {
    					group_outros();
    					const old_component = switch_instance1;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value_1) {
    					switch_instance1 = new switch_value_1(switch_props_1());
    					switch_instance1.$on("refresh", /*handleMessage*/ ctx[15]);
    					create_component(switch_instance1.$$.fragment);
    					transition_in(switch_instance1.$$.fragment, 1);
    					mount_component(switch_instance1, div24, null);
    				} else {
    					switch_instance1 = null;
    				}
    			}

    			if (/*$Token*/ ctx[2].royalty) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*$Token*/ 4) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div27, null);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (dirty[0] & /*$Token, handleMessage*/ 32772) {
    				each_value_3 = /*$Token*/ ctx[2].payments;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    						transition_in(each_blocks_3[i], 1);
    					} else {
    						each_blocks_3[i] = create_each_block_3(child_ctx);
    						each_blocks_3[i].c();
    						transition_in(each_blocks_3[i], 1);
    						each_blocks_3[i].m(div30, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_3.length; i < each_blocks_3.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty[0] & /*$Token, handleMessage*/ 32772) {
    				each_value_2 = /*$Token*/ ctx[2].owns;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    						transition_in(each_blocks_2[i], 1);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						transition_in(each_blocks_2[i], 1);
    						each_blocks_2[i].m(div33, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_2.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}

    			if (dirty[0] & /*$Token, handleMessage*/ 32772) {
    				each_value_1 = /*$Token*/ ctx[2].burned;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(div36, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out_2(i);
    				}

    				check_outros();
    			}

    			if (dirty[0] & /*$Token, handleMessage*/ 32772) {
    				each_value = /*$Token*/ ctx[2].balance;
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
    						each_blocks[i].m(div39, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_3(i);
    				}

    				check_outros();
    			}

    			if (/*$Token*/ ctx[2].puzzle) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(div42, t85);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*$receiver*/ 2048 && input7.value !== /*$receiver*/ ctx[11]) {
    				set_input_value(input7, /*$receiver*/ ctx[11]);
    			}

    			if (!current || dirty[0] & /*tokenStr*/ 16) set_data_dev(t89, /*tokenStr*/ ctx[4]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance0) transition_in(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_in(switch_instance1.$$.fragment, local);
    			transition_in(if_block0);

    			for (let i = 0; i < each_value_3.length; i += 1) {
    				transition_in(each_blocks_3[i]);
    			}

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_2[i]);
    			}

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(meta.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance0) transition_out(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_out(switch_instance1.$$.fragment, local);
    			transition_out(if_block0);
    			each_blocks_3 = each_blocks_3.filter(Boolean);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				transition_out(each_blocks_3[i]);
    			}

    			each_blocks_2 = each_blocks_2.filter(Boolean);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				transition_out(each_blocks_2[i]);
    			}

    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(meta.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (detaching) detach_dev(t25);
    			if (detaching) detach_dev(div44);
    			if (switch_instance0) destroy_component(switch_instance0);
    			if (switch_instance1) destroy_component(switch_instance1);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			destroy_component(meta);
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
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

    function instance$1($$self, $$props, $$invalidate) {
    	let ethCost;
    	let ethCostStr;
    	let usdCost;
    	let valueInEth;
    	let startInDate;
    	let endInDate;
    	let $puzzle;
    	let $receiver;
    	let $token;
    	let $Token;
    	let $gas;
    	let $error;
    	validate_store(puzzle, 'puzzle');
    	component_subscribe($$self, puzzle, $$value => $$invalidate(10, $puzzle = $$value));
    	validate_store(receiver, 'receiver');
    	component_subscribe($$self, receiver, $$value => $$invalidate(11, $receiver = $$value));
    	validate_store(token, 'token');
    	component_subscribe($$self, token, $$value => $$invalidate(18, $token = $$value));
    	validate_store(Token, 'Token');
    	component_subscribe($$self, Token, $$value => $$invalidate(2, $Token = $$value));
    	validate_store(gas, 'gas');
    	component_subscribe($$self, gas, $$value => $$invalidate(3, $gas = $$value));
    	validate_store(error, 'error');
    	component_subscribe($$self, error, $$value => $$invalidate(12, $error = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Cell', slots, []);
    	let tokenStr = "";
    	let rate = 0;
    	let price = 0;

    	const getrate = async () => {
    		let r = await fetch('https://ethgasstation.info/api/ethgasAPI.json').then(res => {
    			return res.json();
    		});

    		return {
    			fast: r.fast,
    			fastest: r.fastest,
    			slow: r.safeLow,
    			average: r.average
    		};
    	};

    	const getprice = async () => {
    		let r = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum').then(res => {
    			return res.json();
    		});

    		return r[0].current_price;
    	};

    	const setRoyalty = () => {
    		set_store_value(
    			Token,
    			$Token.royalty = {
    				what: "20000",
    				where: "0x502b2FE7Cc3488fcfF2E16158615AF87b4Ab5C41"
    			},
    			$Token
    		);
    	};

    	const addRelation = type => {
    		console.log(type);

    		if (type === "payments") {
    			set_store_value(Token, $Token.payments = $Token.payments.concat({ what: "", where: "" }), $Token);
    		} else if (type === "owns") {
    			set_store_value(Token, $Token.owns = $Token.owns.concat({ who: "sender", what: "", where: "" }), $Token);
    		} else if (type === "burned") {
    			set_store_value(Token, $Token.burned = $Token.burned.concat({ who: "sender", what: "", where: "" }), $Token);
    		} else if (type === "balance") {
    			set_store_value(Token, $Token.balance = $Token.balance.concat({ who: "sender", what: "", where: "" }), $Token);
    		}
    	};

    	const handleMessage = () => {
    		Token.set($Token);
    	};

    	const mint = async () => {
    		const c0 = new window.C0();
    		const web3 = new Web3(window.ethereum);
    		await c0.init({ web3 });

    		try {
    			await c0.token.send([$token], [{ receiver: $receiver, puzzle: $puzzle }]);
    		} catch(e) {
    			
    		} //    $error = e.message
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Cell> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		$Token.cid = this.value;
    		Token.set($Token);
    	}

    	function input1_input_handler() {
    		$Token.sender = this.value;
    		Token.set($Token);
    	}

    	function input2_input_handler() {
    		$Token.receiver = this.value;
    		Token.set($Token);
    	}

    	function input3_input_handler() {
    		$Token.value = to_number(this.value);
    		Token.set($Token);
    	}

    	function input4_input_handler() {
    		$Token.start = this.value;
    		Token.set($Token);
    	}

    	function input5_input_handler() {
    		$Token.end = this.value;
    		Token.set($Token);
    	}

    	function input6_input_handler() {
    		$Token.puzzle = this.value;
    		Token.set($Token);
    	}

    	const click_handler = () => setRoyalty();
    	const click_handler_1 = () => addRelation("payments");
    	const click_handler_2 = () => addRelation("owns");
    	const click_handler_3 = () => addRelation("burned");
    	const click_handler_4 = () => addRelation("balance");

    	function input_input_handler() {
    		$puzzle = this.value;
    		puzzle.set($puzzle);
    	}

    	function input7_input_handler() {
    		$receiver = this.value;
    		receiver.set($receiver);
    	}

    	$$self.$capture_state = () => ({
    		Relation,
    		List,
    		Meta,
    		onMount,
    		error,
    		puzzle,
    		receiver,
    		gas,
    		token,
    		Token,
    		tokenStr,
    		rate,
    		price,
    		getrate,
    		getprice,
    		setRoyalty,
    		addRelation,
    		handleMessage,
    		mint,
    		endInDate,
    		startInDate,
    		valueInEth,
    		ethCost,
    		usdCost,
    		ethCostStr,
    		$puzzle,
    		$receiver,
    		$token,
    		$Token,
    		$gas,
    		$error
    	});

    	$$self.$inject_state = $$props => {
    		if ('tokenStr' in $$props) $$invalidate(4, tokenStr = $$props.tokenStr);
    		if ('rate' in $$props) $$invalidate(0, rate = $$props.rate);
    		if ('price' in $$props) $$invalidate(1, price = $$props.price);
    		if ('endInDate' in $$props) $$invalidate(5, endInDate = $$props.endInDate);
    		if ('startInDate' in $$props) $$invalidate(6, startInDate = $$props.startInDate);
    		if ('valueInEth' in $$props) $$invalidate(7, valueInEth = $$props.valueInEth);
    		if ('ethCost' in $$props) $$invalidate(17, ethCost = $$props.ethCost);
    		if ('usdCost' in $$props) $$invalidate(8, usdCost = $$props.usdCost);
    		if ('ethCostStr' in $$props) $$invalidate(9, ethCostStr = $$props.ethCostStr);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*$token*/ 262144) {
    			$$invalidate(4, tokenStr = JSON.stringify($token, null, 2));
    		}

    		if ($$self.$$.dirty[0] & /*$gas, rate*/ 9) {
    			$$invalidate(17, ethCost = Math.floor($gas * rate / Math.pow(10, 10) * 10 ** 6) / 10 ** 6);
    		}

    		if ($$self.$$.dirty[0] & /*ethCost*/ 131072) {
    			$$invalidate(9, ethCostStr = "Ξ" + ethCost);
    		}

    		if ($$self.$$.dirty[0] & /*ethCost, price*/ 131074) {
    			$$invalidate(8, usdCost = "$" + Math.floor(ethCost * price * 10 ** 4) / 10 ** 4);
    		}

    		if ($$self.$$.dirty[0] & /*$Token*/ 4) {
    			$$invalidate(7, valueInEth = $Token.value
    			? `${parseInt($Token.value) / 10 ** 18} ETH`
    			: "");
    		}

    		if ($$self.$$.dirty[0] & /*$Token*/ 4) {
    			$$invalidate(6, startInDate = $Token.start
    			? new Date(parseInt($Token.start) * 1000).toString()
    			: "");
    		}

    		if ($$self.$$.dirty[0] & /*$Token*/ 4) {
    			$$invalidate(5, endInDate = $Token.end
    			? new Date(parseInt($Token.end) * 1000).toString()
    			: "");
    		}
    	};

    	getrate().then(r => {
    		return r.average;
    	}).then(x => {
    		$$invalidate(0, rate = x);
    	});

    	getprice().then(x => {
    		$$invalidate(1, price = x);
    	});

    	return [
    		rate,
    		price,
    		$Token,
    		$gas,
    		tokenStr,
    		endInDate,
    		startInDate,
    		valueInEth,
    		usdCost,
    		ethCostStr,
    		$puzzle,
    		$receiver,
    		$error,
    		setRoyalty,
    		addRelation,
    		handleMessage,
    		mint,
    		ethCost,
    		$token,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		input5_input_handler,
    		input6_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		input_input_handler,
    		input7_input_handler
    	];
    }

    class Cell extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Cell",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.48.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let cell;
    	let current;
    	cell = new Cell({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(cell.$$.fragment);
    			attr_dev(main, "class", "svelte-1e19ctb");
    			add_location(main, file, 3, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(cell, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cell.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cell.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(cell);
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
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Cell });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
