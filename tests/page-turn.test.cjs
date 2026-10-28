const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/common/Flipbooks/pageTurn.ts', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS},
}).outputText, {exports: exportsObject});
const {visiblePages, adjacentPage, pageTurn} = exportsObject;
const pages = (...args) => Array.from(visiblePages(...args));

test('desktop spreads include every page for odd and even book lengths', () => {
    for (let total = 1; total <= 12; total++) {
        const visited = [];
        let current = 1;
        for (;;) {
            visited.push(...pages(current, total, false));
            const next = adjacentPage(current, total, false, 1);
            if (next === current) break;
            current = next;
        }
        assert.deepEqual(visited, Array.from({length: total}, (_, i) => i + 1));
        const backwards = [];
        for (;;) {
            backwards.unshift(...pages(current, total, false));
            const previous = adjacentPage(current, total, false, -1);
            if (previous === current) break;
            current = previous;
        }
        assert.deepEqual(backwards, visited);
    }
});

test('direct links to even pages open the containing spread', () => {
    assert.deepEqual(pages(2, 8, false), [2, 3]);
    assert.deepEqual(pages(4, 8, false), [4, 5]);
    assert.deepEqual(pages(8, 8, false), [8]);
    assert.equal(adjacentPage(2, 8, false, 1), 5);
    assert.equal(adjacentPage(4, 8, false, -1), 3);
});

test('forward and backward turns coordinate both faces of a leaf', () => {
    const front = pageTurn(3, 3, 5, 8, false);
    const back = pageTurn(4, 3, 5, 8, false);
    assert.equal(front.moving, true);
    assert.equal(front.from, 0);
    assert.equal(front.to, -180);
    assert.equal(back.moving, true);
    assert.equal(back.from, 180);
    assert.equal(back.to, 0);
    assert.equal(pageTurn(2, 3, 5, 8, false).moving, false);
    assert.equal(pageTurn(5, 3, 5, 8, false).moving, false);
    assert.equal(pageTurn(4, 5, 3, 8, false).to, 180);
    assert.equal(pageTurn(3, 5, 3, 8, false).from, -180);
});

test('mobile navigation turns one page at a time and respects boundaries', () => {
    for (let page = 1; page <= 8; page++) {
        assert.deepEqual(pages(page, 8, true), [page]);
        assert.equal(adjacentPage(page, 8, true, 1), Math.min(8, page + 1));
        assert.equal(adjacentPage(page, 8, true, -1), Math.max(1, page - 1));
    }
    assert.equal(pageTurn(2, 2, 3, 8, true).to, -180);
    assert.equal(pageTurn(3, 2, 3, 8, true).from, 180);
});
