const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks, globals = {}) {
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX},
    }).outputText;
    const exports = {};
    vm.runInNewContext(source, {exports, require: name => {
        if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
        return mocks[name];
    }, URLSearchParams, AbortController, process, ...globals});
    return exports;
}

function listing() {
    const slots = [];
    let cursor, tree;
    const effects = [];
    const pendingEffects = [];
    const timers = new Map();
    let timerId = 0;
    const requests = [];
    const jsx = (type, props) => ({type, props});
    const component = load('app/(admin)/admin/(protected)/dashboard/flipbooks/FlipBookMultiView/index.tsx', {
        react: {
            useState(initial) {
                const index = cursor++;
                if (!(index in slots)) slots[index] = initial;
                return [slots[index], value => {slots[index] = typeof value === 'function' ? value(slots[index]) : value;}];
            },
            useRef(initial) {
                const index = cursor++;
                if (!(index in slots)) slots[index] = {current: initial};
                return slots[index];
            },
            useEffect(callback, deps) {
                const index = cursor++;
                const previous = effects[index];
                if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
                    pendingEffects.push(() => {
                        previous?.cleanup?.();
                        effects[index] = {deps, cleanup: callback()};
                    });
                }
            },
        },
        'react/jsx-runtime': {jsx, jsxs: jsx},
        './FlipBookAdminView': {default: 'Card'},
        '../actions/readCounts': {getFlipbookReadCounts: async () => ({})},
    }, {setTimeout: (callback, delay) => {timers.set(++timerId, {callback, delay}); return timerId;},
        clearTimeout: id => timers.delete(id),
        fetch: (url, options) => new Promise((resolve, reject) => requests.push({url, options, resolve, reject}))}).default;
    function render() {
        cursor = 0;
        tree = component({coverBaseUrl: ''});
        while (pendingEffects.length) pendingEffects.shift()();
    }
    function nodes(node = tree) {
        if (!node || typeof node !== 'object') return [];
        return [node, ...[node.props?.children].flat(Infinity).filter(child => child != null).flatMap(child => nodes(child))];
    }
    async function respond(index, count, status = 200) {
        requests[index].resolve({ok: status === 200, status, json: async () => Array.from({length: count}, (_, i) => ({id: `${index}-${i}`}))});
        await new Promise(resolve => setImmediate(resolve));
        render();
    }
    render();
    return {requests, render, respond, nodes, timers,
        type: value => {nodes().find(node => node.props?.id === 'flipbook-title-search').props.onChange({target: {value}}); render();},
        advance: milliseconds => {
            for (const [id, timer] of [...timers]) {
                timer.delay -= milliseconds;
                if (timer.delay <= 0) {timers.delete(id); timer.callback();}
            }
            render();
        },
        unmount: () => effects.forEach(effect => effect?.cleanup?.()),
        button: name => nodes().find(node => node.type === 'button' && node.props.children === name),
        page: () => nodes().find(node => node.props?.['aria-live'] === 'polite').props.children.join(''),
        cards: () => nodes().filter(node => node.type === 'Card'),
    };
}

test('server pages, last-page detection, and empty Next retain the previous page', async () => {
    const view = listing();
    assert.match(view.requests[0].url, /page=1&limit=20/);
    assert.equal(view.button('Previous').props.disabled, true);
    await view.respond(0, 20);
    assert.equal(view.button('Next').props.disabled, false);
    view.button('Next').props.onClick();
    view.render();
    assert.match(view.requests[1].url, /page=2/);
    await view.respond(1, 0, 404);
    assert.equal(view.page(), 'Page 1');
    assert.equal(view.cards().length, 20);
    assert.equal(view.button('Next').props.disabled, true);
});

test('filter changes reset page, omit drafts, and reject stale responses', async () => {
    const view = listing();
    await view.respond(0, 20);
    view.button('Next').props.onClick();
    view.render();
    const checkbox = view.nodes().find(node => node.type === 'input' && node.props.type === 'checkbox');
    checkbox.props.onChange({target: {checked: false}});
    view.render();
    assert.match(view.requests[2].url, /page=1/);
    assert.doesNotMatch(view.requests[2].url, /showDrafts/);
    assert.equal(view.requests[1].options.signal.aborted, true);
    await view.respond(2, 3);
    await view.respond(1, 20);
    assert.equal(view.page(), 'Page 1');
    assert.equal(view.cards().length, 3);
    assert.equal(view.button('Next').props.disabled, true);
});

test('listing failures show an error and retry the selected page', async () => {
    const view = listing();
    await view.respond(0, 0, 500);
    assert.ok(view.nodes().some(node => node.props?.role === 'alert'));
    view.button('Retry').props.onClick();
    view.render();
    await view.respond(1, 0, 404);
    assert.equal(view.cards().length, 0);
    assert.ok(view.nodes().some(node => node.props?.children === 'No flipbooks found.'));
});

test('proxy forwards pagination and auth, omits false drafts, and preserves empty 404', async () => {
    let backendUrl, backendOptions;
    const route = load('app/api/flipbooks/[[...id]]/route.ts', {
        'next/server': {NextResponse: {json: (data, options) => ({data, ...options})}},
        '@/app/common/Auth/actions': {checkOrRefreshToken: async () => ({value: 'test-token'})},
        'next/headers': {cookies: async () => ({get: () => undefined})},
    }, {fetch: async (url, options) => {
        backendUrl = url;
        backendOptions = options;
        return {status: 404, json: async () => []};
    }});
    const response = await route.GET({nextUrl: new URL('http://localhost/api/flipbooks?page=2&limit=20&showDrafts=false&orderBy=title&orderDirection=ASC&title=summer%20%26%20sun')}, {params: Promise.resolve({})});
    const query = new URLSearchParams(backendUrl.split('?')[1]);
    assert.equal(query.get('title'), 'summer & sun');
    assert.equal(query.get('page'), '2');
    assert.equal(query.get('limit'), '20');
    assert.equal(query.get('orderBy'), 'title');
    assert.equal(query.get('orderDirection'), 'ASC');
    assert.equal(query.has('showDrafts'), false);
    assert.equal(backendOptions.headers.Authorization, 'Bearer test-token');
    assert.equal(response.status, 404);
    assert.deepEqual(response.data, []);
});


test('page size and sorting changes reset a displayed later page', async () => {
    const view = listing();
    await view.respond(0, 20);
    view.button('Next').props.onClick();
    view.render();
    await view.respond(1, 20);
    assert.equal(view.page(), 'Page 2');
    view.nodes().find(node => node.type === 'select' && node.props.value === 20).props.onChange({target: {value: '50'}});
    view.render();
    assert.match(view.requests[2].url, /page=1&limit=50/);
    await view.respond(2, 50);
    view.button('Next').props.onClick();
    view.render();
    await view.respond(3, 50);
    view.nodes().find(node => node.type === 'select' && node.props.value === 'created_at').props.onChange({target: {value: 'title'}});
    view.render();
    assert.match(view.requests[4].url, /page=1&limit=50&orderBy=title/);
    await view.respond(4, 2);
    assert.equal(view.page(), 'Page 1');
});

test('rapid typing is immediate and sends only the trimmed final search after 300ms', async () => {
    const view = listing();
    await view.respond(0, 20);
    view.type('s');
    view.advance(200);
    view.type('summer & sun  ');
    assert.equal(view.nodes().find(node => node.props?.id === 'flipbook-title-search').props.value, 'summer & sun  ');
    view.advance(299);
    assert.equal(view.requests.length, 1);
    view.advance(1);
    assert.equal(view.requests.length, 2);
    const query = new URLSearchParams(view.requests[1].url.split('?')[1]);
    assert.equal(query.get('title'), 'summer & sun');
    assert.equal(query.get('page'), '1');
    await view.respond(1, 0, 404);
    assert.ok(view.nodes().some(node => node.props?.children === 'No flipbooks match your search'));
    assert.equal(view.button('Next').props.disabled, true);
    assert.equal(view.nodes().some(node => node.props?.role === 'alert'), false);
});

test('search from a later page commits page one atomically and persists across listing controls', async () => {
    const view = listing();
    await view.respond(0, 20);
    view.button('Next').props.onClick();
    view.render();
    await view.respond(1, 20);
    view.type('summer');
    view.advance(300);
    assert.equal(view.requests.length, 3);
    assert.match(view.requests[2].url, /page=1/);
    assert.match(view.requests[2].url, /title=summer/);
    await view.respond(2, 20);
    view.button('Next').props.onClick();
    view.render();
    assert.match(view.requests[3].url, /page=2/);
    assert.match(view.requests[3].url, /title=summer/);
    await view.respond(3, 20);
    for (const [value, next] of [['created_at', 'title'], ['DESC', 'ASC'], [20, '50']]) {
        view.nodes().find(node => node.type === 'select' && node.props.value === value).props.onChange({target: {value: next}});
        view.render();
        const index = view.requests.length - 1;
        assert.match(view.requests[index].url, /page=1/);
        assert.match(view.requests[index].url, /title=summer/);
        await view.respond(index, 50);
    }
    view.nodes().find(node => node.props?.type === 'checkbox').props.onChange({target: {checked: false}});
    view.render();
    assert.match(view.requests.at(-1).url, /title=summer/);
    assert.doesNotMatch(view.requests.at(-1).url, /showDrafts/);
});

test('clearing search restores unfiltered results and stale searches cannot replace them', async () => {
    const view = listing();
    await view.respond(0, 20);
    view.type('summer');
    view.advance(300);
    view.type('   ');
    view.advance(299);
    assert.equal(view.requests.length, 2);
    view.advance(1);
    assert.doesNotMatch(view.requests[2].url, /title=/);
    assert.equal(view.requests[1].options.signal.aborted, true);
    await view.respond(2, 5);
    await view.respond(1, 20);
    assert.equal(view.cards().length, 5);
    assert.equal(view.page(), 'Page 1');
    assert.equal(view.nodes().some(node => node.props?.role === 'alert'), false);
});

test('unmount cancels debounce timers and pending listing requests', async () => {
    const view = listing();
    view.type('summer');
    assert.equal(view.timers.size, 1);
    view.unmount();
    assert.equal(view.timers.size, 0);
    assert.equal(view.requests[0].options.signal.aborted, true);
    view.advance(300);
    assert.equal(view.requests.length, 1);
});

test('an empty Next search page retains results and stays disabled until settings change', async () => {
    const view = listing();
    await view.respond(0, 20);
    view.type('summer');
    view.advance(300);
    await view.respond(1, 20);
    view.button('Next').props.onClick();
    view.render();
    await view.respond(2, 20);
    view.button('Next').props.onClick();
    view.render();
    await view.respond(3, 0, 404);
    assert.equal(view.page(), 'Page 2');
    assert.equal(view.cards()[0].props.flipBook.id, '2-0');
    assert.equal(view.button('Next').props.disabled, true);
    view.button('Previous').props.onClick();
    view.render();
    await view.respond(4, 20);
    assert.equal(view.button('Next').props.disabled, true);
    view.type('winter');
    view.advance(300);
    await view.respond(5, 20);
    assert.equal(view.button('Next').props.disabled, false);
});

test('superseded request abort rejections do not show an error', async () => {
    const view = listing();
    view.type('summer');
    view.advance(300);
    view.requests[0].reject(Object.assign(new Error('Aborted'), {name: 'AbortError'}));
    await new Promise(resolve => setImmediate(resolve));
    view.render();
    assert.equal(view.nodes().some(node => node.props?.role === 'alert'), false);
    await view.respond(1, 2);
    assert.equal(view.cards().length, 2);
});
