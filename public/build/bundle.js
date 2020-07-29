
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
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
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
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
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
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
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Problem.svelte generated by Svelte v3.24.0 */

    const file = "src/Problem.svelte";

    function create_fragment(ctx) {
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let div1_class_value;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(/*operandA*/ ctx[1]);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(/*operandB*/ ctx[2]);
    			attr_dev(div0, "class", "operand operand--a svelte-mr8j50");
    			add_location(div0, file, 31, 0, 502);
    			attr_dev(div1, "class", div1_class_value = "operand operand--b " + /*operator*/ ctx[0] + " svelte-mr8j50");
    			add_location(div1, file, 32, 0, 551);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*operandA*/ 2) set_data_dev(t0, /*operandA*/ ctx[1]);
    			if (dirty & /*operandB*/ 4) set_data_dev(t2, /*operandB*/ ctx[2]);

    			if (dirty & /*operator*/ 1 && div1_class_value !== (div1_class_value = "operand operand--b " + /*operator*/ ctx[0] + " svelte-mr8j50")) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
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
    	let { operator } = $$props, { operandA } = $$props, { operandB } = $$props;
    	const writable_props = ["operator", "operandA", "operandB"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Problem> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Problem", $$slots, []);

    	$$self.$set = $$props => {
    		if ("operator" in $$props) $$invalidate(0, operator = $$props.operator);
    		if ("operandA" in $$props) $$invalidate(1, operandA = $$props.operandA);
    		if ("operandB" in $$props) $$invalidate(2, operandB = $$props.operandB);
    	};

    	$$self.$capture_state = () => ({ operator, operandA, operandB });

    	$$self.$inject_state = $$props => {
    		if ("operator" in $$props) $$invalidate(0, operator = $$props.operator);
    		if ("operandA" in $$props) $$invalidate(1, operandA = $$props.operandA);
    		if ("operandB" in $$props) $$invalidate(2, operandB = $$props.operandB);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [operator, operandA, operandB];
    }

    class Problem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { operator: 0, operandA: 1, operandB: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Problem",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*operator*/ ctx[0] === undefined && !("operator" in props)) {
    			console.warn("<Problem> was created without expected prop 'operator'");
    		}

    		if (/*operandA*/ ctx[1] === undefined && !("operandA" in props)) {
    			console.warn("<Problem> was created without expected prop 'operandA'");
    		}

    		if (/*operandB*/ ctx[2] === undefined && !("operandB" in props)) {
    			console.warn("<Problem> was created without expected prop 'operandB'");
    		}
    	}

    	get operator() {
    		throw new Error("<Problem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set operator(value) {
    		throw new Error("<Problem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get operandA() {
    		throw new Error("<Problem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set operandA(value) {
    		throw new Error("<Problem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get operandB() {
    		throw new Error("<Problem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set operandB(value) {
    		throw new Error("<Problem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Test.svelte generated by Svelte v3.24.0 */

    const { console: console_1 } = globals;
    const file$1 = "src/Test.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    // (133:2) {:else}
    function create_else_block(ctx) {
    	let h3;
    	let t1;
    	let div;
    	let each_value = /*families*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Start with";
    			t1 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h3, "class", "start");
    			add_location(h3, file$1, 133, 4, 3392);
    			attr_dev(div, "class", "family-list svelte-1j3xgcx");
    			add_location(div, file$1, 134, 4, 3430);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectFamily, families*/ 48) {
    				each_value = /*families*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(133:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (131:2) {#if family}
    function create_if_block(ctx) {
    	let problem;
    	let current;

    	problem = new Problem({
    			props: {
    				operandA: /*operandA*/ ctx[2],
    				operandB: /*operandB*/ ctx[3],
    				operator: /*operator*/ ctx[0]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(problem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(problem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const problem_changes = {};
    			if (dirty & /*operandA*/ 4) problem_changes.operandA = /*operandA*/ ctx[2];
    			if (dirty & /*operandB*/ 8) problem_changes.operandB = /*operandB*/ ctx[3];
    			if (dirty & /*operator*/ 1) problem_changes.operator = /*operator*/ ctx[0];
    			problem.$set(problem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(problem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(problem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(problem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(131:2) {#if family}",
    		ctx
    	});

    	return block;
    }

    // (136:6) {#each families as familyOption}
    function create_each_block(ctx) {
    	let button;
    	let t0_value = /*familyOption*/ ctx[18] + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[6](/*familyOption*/ ctx[18], ...args);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(button, "class", "family-option svelte-1j3xgcx");
    			add_location(button, file$1, 136, 8, 3503);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(136:6) {#each families as familyOption}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*family*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			add_location(div, file$1, 129, 0, 3308);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
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
    	let { operator = "add" } = $$props;
    	const dispatch = createEventDispatcher();

    	// Set up speech recognition
    	const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;

    	const SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
    	const recognition = new SpeechRecognition();
    	recognition.continuous = true;
    	recognition.lang = "en-US";
    	recognition.interimResults = false;
    	recognition.maxAlternatives = 5;
    	const families = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, "all"];
    	let family;
    	let operandA, operandB;
    	let answer;
    	let correctAnswers = [];
    	let incorrectAnswers = [];

    	const operations = {
    		add(a, b) {
    			return a + b;
    		},
    		subtract(a, b) {
    			return a - b;
    		},
    		multiply(a, b) {
    			return a * b;
    		},
    		divide(a, b) {
    			$$invalidate(2, operandA = a * b);
    			$$invalidate(3, operandB = b);
    			return a;
    		}
    	};

    	const selectFamily = fam => {
    		$$invalidate(1, family = fam);
    		recognition.start();
    		setOperands();
    	};

    	const setOperands = () => {
    		dispatch("incorrectGuess", { guess: null });

    		const firstRandom = family === "all"
    		? Math.floor(Math.random() * 13)
    		: family;

    		const secondRandom = Math.floor(Math.random() * 13);
    		const swap = Math.random() > 0.5;
    		$$invalidate(2, operandA = swap ? secondRandom : firstRandom);
    		$$invalidate(3, operandB = swap ? firstRandom : secondRandom);
    		answer = operations[operator](operandA, operandB);
    	};

    	const recordAnswer = (wasLastCorrect, guess) => {
    		dispatch("answer", { wasLastCorrect });
    		const answer = { a: operandA, b: operandB, guess };

    		if (wasLastCorrect) {
    			correctAnswers = [...correctAnswers, answer];
    		} else {
    			incorrectAnswers = [...incorrectAnswers, answer];
    		}

    		console.log("CORRECT", correctAnswers);
    		console.log("INCORRECT", incorrectAnswers);
    	};

    	const showError = guess => {
    		dispatch("incorrectGuess", { guess });
    	};

    	recognition.onresult = function (event) {
    		const speech = event.results[event.results.length - 1][0].transcript;
    		let guess = speech;
    		let isCorrect;

    		if (guess === "pass") {
    			isCorrect = false;
    		} else {
    			guess = parseInt(guess, 10);
    			isCorrect = guess === answer;

    			// The top result might not be a number, so try a few more options
    			if (isNaN(guess)) {
    				console.log(Array.from(event.results[event.results.length - 1]));

    				try {
    					guess = parseInt(Array.from(event.results[event.results.length - 1]).find(g => !isNaN(parseInt(g.transcript, 10))).transcript, 10);
    				} catch(err) {
    					showError(event.results[event.results.length - 1][0].transcript);
    				}

    				isCorrect = guess === answer;
    			}
    		}

    		if (isCorrect) {
    			setOperands();
    		} else {
    			showError(isNaN(guess) ? speech : guess);
    		}

    		recordAnswer(isCorrect, guess);
    	};

    	recognition.onspeechend = () => {
    		recognition.stop();
    	};

    	const writable_props = ["operator"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Test> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Test", $$slots, []);
    	const click_handler = familyOption => selectFamily(familyOption);

    	$$self.$set = $$props => {
    		if ("operator" in $$props) $$invalidate(0, operator = $$props.operator);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Problem,
    		operator,
    		dispatch,
    		SpeechRecognition,
    		SpeechRecognitionEvent,
    		recognition,
    		families,
    		family,
    		operandA,
    		operandB,
    		answer,
    		correctAnswers,
    		incorrectAnswers,
    		operations,
    		selectFamily,
    		setOperands,
    		recordAnswer,
    		showError
    	});

    	$$self.$inject_state = $$props => {
    		if ("operator" in $$props) $$invalidate(0, operator = $$props.operator);
    		if ("family" in $$props) $$invalidate(1, family = $$props.family);
    		if ("operandA" in $$props) $$invalidate(2, operandA = $$props.operandA);
    		if ("operandB" in $$props) $$invalidate(3, operandB = $$props.operandB);
    		if ("answer" in $$props) answer = $$props.answer;
    		if ("correctAnswers" in $$props) correctAnswers = $$props.correctAnswers;
    		if ("incorrectAnswers" in $$props) incorrectAnswers = $$props.incorrectAnswers;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [operator, family, operandA, operandB, families, selectFamily, click_handler];
    }

    class Test extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { operator: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Test",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get operator() {
    		throw new Error("<Test>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set operator(value) {
    		throw new Error("<Test>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/TestTypeSelector.svelte generated by Svelte v3.24.0 */

    const file$2 = "src/TestTypeSelector.svelte";

    function create_fragment$2(ctx) {
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "class", "test-type svelte-gqze8s");
    			attr_dev(button, "data-operator", "add");
    			attr_dev(button, "id", "addition-button");
    			add_location(button, file$2, 14, 0, 209);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[0], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
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
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TestTypeSelector> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("TestTypeSelector", $$slots, ['default']);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, $$slots, click_handler];
    }

    class TestTypeSelector extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TestTypeSelector",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/FlashCard.svelte generated by Svelte v3.24.0 */
    const file$3 = "src/FlashCard.svelte";

    // (50:2) {:else}
    function create_else_block$1(ctx) {
    	let testtypeselector0;
    	let t0;
    	let testtypeselector1;
    	let t1;
    	let testtypeselector2;
    	let t2;
    	let testtypeselector3;
    	let current;

    	testtypeselector0 = new TestTypeSelector({
    			props: {
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	testtypeselector0.$on("click", /*click_handler*/ ctx[5]);

    	testtypeselector1 = new TestTypeSelector({
    			props: {
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	testtypeselector1.$on("click", /*click_handler_1*/ ctx[6]);

    	testtypeselector2 = new TestTypeSelector({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	testtypeselector2.$on("click", /*click_handler_2*/ ctx[7]);

    	testtypeselector3 = new TestTypeSelector({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	testtypeselector3.$on("click", /*click_handler_3*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(testtypeselector0.$$.fragment);
    			t0 = space();
    			create_component(testtypeselector1.$$.fragment);
    			t1 = space();
    			create_component(testtypeselector2.$$.fragment);
    			t2 = space();
    			create_component(testtypeselector3.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(testtypeselector0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(testtypeselector1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(testtypeselector2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(testtypeselector3, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const testtypeselector0_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				testtypeselector0_changes.$$scope = { dirty, ctx };
    			}

    			testtypeselector0.$set(testtypeselector0_changes);
    			const testtypeselector1_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				testtypeselector1_changes.$$scope = { dirty, ctx };
    			}

    			testtypeselector1.$set(testtypeselector1_changes);
    			const testtypeselector2_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				testtypeselector2_changes.$$scope = { dirty, ctx };
    			}

    			testtypeselector2.$set(testtypeselector2_changes);
    			const testtypeselector3_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				testtypeselector3_changes.$$scope = { dirty, ctx };
    			}

    			testtypeselector3.$set(testtypeselector3_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(testtypeselector0.$$.fragment, local);
    			transition_in(testtypeselector1.$$.fragment, local);
    			transition_in(testtypeselector2.$$.fragment, local);
    			transition_in(testtypeselector3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(testtypeselector0.$$.fragment, local);
    			transition_out(testtypeselector1.$$.fragment, local);
    			transition_out(testtypeselector2.$$.fragment, local);
    			transition_out(testtypeselector3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(testtypeselector0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(testtypeselector1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(testtypeselector2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(testtypeselector3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(50:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (48:2) {#if operator}
    function create_if_block$1(ctx) {
    	let test;
    	let current;

    	test = new Test({
    			props: { operator: /*operator*/ ctx[1] },
    			$$inline: true
    		});

    	test.$on("answer", /*answerReceived*/ ctx[3]);
    	test.$on("incorrectGuess", /*incorrectGuess_handler*/ ctx[4]);

    	const block = {
    		c: function create() {
    			create_component(test.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(test, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const test_changes = {};
    			if (dirty & /*operator*/ 2) test_changes.operator = /*operator*/ ctx[1];
    			test.$set(test_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(test.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(test.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(test, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(48:2) {#if operator}",
    		ctx
    	});

    	return block;
    }

    // (51:4) <TestTypeSelector on:click={() => typeSelected('add')}>
    function create_default_slot_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Addition");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(51:4) <TestTypeSelector on:click={() => typeSelected('add')}>",
    		ctx
    	});

    	return block;
    }

    // (54:4) <TestTypeSelector on:click={() => typeSelected('subtract')}>
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Subtraction");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(54:4) <TestTypeSelector on:click={() => typeSelected('subtract')}>",
    		ctx
    	});

    	return block;
    }

    // (57:4) <TestTypeSelector on:click={() => typeSelected('multiply')}>
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Multiplication");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(57:4) <TestTypeSelector on:click={() => typeSelected('multiply')}>",
    		ctx
    	});

    	return block;
    }

    // (60:4) <TestTypeSelector on:click={() => typeSelected('divide')}>
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Division");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(60:4) <TestTypeSelector on:click={() => typeSelected('divide')}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let section;
    	let current_block_type_index;
    	let if_block;
    	let section_class_value;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*operator*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			if_block.c();
    			attr_dev(section, "class", section_class_value = "" + (null_to_empty(/*cl*/ ctx[0]) + " svelte-12b3ko6"));
    			add_location(section, file$3, 46, 0, 962);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			if_blocks[current_block_type_index].m(section, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(section, null);
    			}

    			if (!current || dirty & /*cl*/ 1 && section_class_value !== (section_class_value = "" + (null_to_empty(/*cl*/ ctx[0]) + " svelte-12b3ko6"))) {
    				attr_dev(section, "class", section_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if_blocks[current_block_type_index].d();
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
    	let cl = "";
    	let operator = null;

    	const typeSelected = op => {
    		$$invalidate(1, operator = op);
    	};

    	const answerReceived = ({ detail: { wasLastCorrect } }) => {
    		const answerClass = wasLastCorrect ? "correct-answer" : "wrong-answer";
    		$$invalidate(0, cl = answerClass);

    		setTimeout(
    			() => {
    				$$invalidate(0, cl = "");
    			},
    			900
    		);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FlashCard> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FlashCard", $$slots, []);

    	function incorrectGuess_handler(event) {
    		bubble($$self, event);
    	}

    	const click_handler = () => typeSelected("add");
    	const click_handler_1 = () => typeSelected("subtract");
    	const click_handler_2 = () => typeSelected("multiply");
    	const click_handler_3 = () => typeSelected("divide");

    	$$self.$capture_state = () => ({
    		Test,
    		TestTypeSelector,
    		cl,
    		operator,
    		typeSelected,
    		answerReceived
    	});

    	$$self.$inject_state = $$props => {
    		if ("cl" in $$props) $$invalidate(0, cl = $$props.cl);
    		if ("operator" in $$props) $$invalidate(1, operator = $$props.operator);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		cl,
    		operator,
    		typeSelected,
    		answerReceived,
    		incorrectGuess_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class FlashCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FlashCard",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/IncorrectGuess.svelte generated by Svelte v3.24.0 */

    const file$4 = "src/IncorrectGuess.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(/*guess*/ ctx[0]);
    			t1 = text(" is not the right answer");
    			attr_dev(div, "class", "svelte-o5jds6");
    			add_location(div, file$4, 15, 0, 197);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*guess*/ 1) set_data_dev(t0, /*guess*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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
    	let { guess } = $$props;
    	const writable_props = ["guess"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<IncorrectGuess> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("IncorrectGuess", $$slots, []);

    	$$self.$set = $$props => {
    		if ("guess" in $$props) $$invalidate(0, guess = $$props.guess);
    	};

    	$$self.$capture_state = () => ({ guess });

    	$$self.$inject_state = $$props => {
    		if ("guess" in $$props) $$invalidate(0, guess = $$props.guess);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [guess];
    }

    class IncorrectGuess extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { guess: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "IncorrectGuess",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*guess*/ ctx[0] === undefined && !("guess" in props)) {
    			console.warn("<IncorrectGuess> was created without expected prop 'guess'");
    		}
    	}

    	get guess() {
    		throw new Error("<IncorrectGuess>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set guess(value) {
    		throw new Error("<IncorrectGuess>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.0 */
    const file$5 = "src/App.svelte";

    // (42:2) {#if incorrectGuess}
    function create_if_block$2(ctx) {
    	let incorrectguess;
    	let current;

    	incorrectguess = new IncorrectGuess({
    			props: { guess: /*incorrectGuess*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(incorrectguess.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(incorrectguess, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const incorrectguess_changes = {};
    			if (dirty & /*incorrectGuess*/ 1) incorrectguess_changes.guess = /*incorrectGuess*/ ctx[0];
    			incorrectguess.$set(incorrectguess_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(incorrectguess.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(incorrectguess.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(incorrectguess, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(42:2) {#if incorrectGuess}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let flashcard;
    	let t2;
    	let current;
    	flashcard = new FlashCard({ $$inline: true });
    	flashcard.$on("incorrectGuess", /*showIncorrectGuess*/ ctx[1]);
    	let if_block = /*incorrectGuess*/ ctx[0] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Math Flash!";
    			t1 = space();
    			create_component(flashcard.$$.fragment);
    			t2 = space();
    			if (if_block) if_block.c();
    			attr_dev(h1, "class", "svelte-qe38ee");
    			add_location(h1, file$5, 37, 2, 643);
    			attr_dev(main, "class", "svelte-qe38ee");
    			add_location(main, file$5, 36, 0, 634);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			mount_component(flashcard, main, null);
    			append_dev(main, t2);
    			if (if_block) if_block.m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*incorrectGuess*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*incorrectGuess*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flashcard.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flashcard.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(flashcard);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let incorrectGuess;

    	const showIncorrectGuess = ({ detail: { guess } }) => {
    		$$invalidate(0, incorrectGuess = guess);

    		setTimeout(
    			() => {
    				$$invalidate(0, incorrectGuess = null);
    			},
    			3000
    		);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		FlashCard,
    		IncorrectGuess,
    		incorrectGuess,
    		showIncorrectGuess
    	});

    	$$self.$inject_state = $$props => {
    		if ("incorrectGuess" in $$props) $$invalidate(0, incorrectGuess = $$props.incorrectGuess);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [incorrectGuess, showIncorrectGuess];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
