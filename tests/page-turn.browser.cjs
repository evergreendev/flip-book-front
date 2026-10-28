// Set PLAYWRIGHT_MODULE and ESBUILD_MODULE if these packages live outside this project.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

test('page turns retain full width, rotate around the spine, and settle in Chromium', {timeout: 60000}, async () => {
    const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
    const esbuild = require(process.env.ESBUILD_MODULE || 'esbuild');
    const bundle = await esbuild.build({
        stdin: {contents: `
            import React, {useState} from 'react';
            import {createRoot} from 'react-dom/client';
            import Page from './app/common/Flipbooks/components/Page';
            import {adjacentPage} from './app/common/Flipbooks/pageTurn';
            function Book() {
                const [page, setPage] = useState(1);
                const [single, setSingle] = useState(false);
                window.single = single;
                window.changeLayout = value => {setSingle(value); setPage(1);};
                return <>
                    <button onClick={() => setPage(p => adjacentPage(p, 8, single, -1))}>Previous</button>
                    <button onClick={() => setPage(p => adjacentPage(p, 8, single, 1))}>Next</button>
                    <output>{page}</output>
                    <div style={{position:'relative', width:640, height:440, perspective:1600, margin:'50px auto'}}>
                        {Array.from({length:8}, (_, i) => <Page key={i} thisPage={i+1} currentPage={page}
                            maxPage={8} flipBookWidth={640} flipBookHeight={440} zoomLevel={1}
                            overlays={[]} pdfUrl="" renderedPageUrl="" flipbookId="fixture"
                            shouldRender={true} shouldClearQueue={false} setRenderedPages={() => {}} loadPdf={() => {}} />)}
                    </div>
                </>;
            }
            createRoot(document.getElementById('root')).render(<Book />);
        `, resolveDir: process.cwd(), loader: 'tsx'},
        bundle: true, write: false, format: 'iife', jsx: 'automatic',
        plugins: [{name: 'fixture-data', setup(build) {
            build.onResolve({filter: /PDFRenderer$|OverlayRenderer$|useScreenSize$|Analytics\/actions$|EditorContext$/}, args => ({path: args.path, namespace: 'fixture'}));
            build.onLoad({filter: /.*/, namespace: 'fixture'}, args => {
                let contents;
                if (args.path.endsWith('PDFRenderer')) contents = `
                    import React, {useEffect} from 'react';
                    export default function PDF(props) {
                        useEffect(() => {
                            props.setCanvasWidth(320); props.setCanvasHeight(440);
                            const canvas = props.canvasRef.current;
                            canvas.width = 320; canvas.height = 440;
                            const ctx = canvas.getContext('2d');
                            ctx.fillStyle = ['#f6d9a1','#bde4d4','#b8d6f4'][props.currPage % 3];
                            ctx.fillRect(0,0,320,440); ctx.fillStyle = '#222'; ctx.font = '48px sans-serif';
                            ctx.fillText('Page ' + props.currPage, 70, 220);
                        }, []);
                        return <canvas ref={props.canvasRef} />;
                    }`;
                else if (args.path.endsWith('OverlayRenderer')) contents = 'export default function Overlay() {return null;}';
                else if (args.path.endsWith('useScreenSize')) contents = 'export function useScreenSize() {return {isBelow1000px: !!window.single};}';
                else if (args.path.endsWith('EditorContext')) contents = "import {createContext} from 'react'; export default createContext({mode:'view'});";
                else contents = 'export function addImpression() {}';
                return {contents, loader: 'tsx', resolveDir: process.cwd()};
            });
        }}],
    });
    const script = bundle.outputFiles[0].text;
    const server = http.createServer((req, res) => {
        res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : 'text/html');
        res.end(req.url === '/app.js' ? script : '<style>.absolute{position:absolute}.relative{position:relative}.inset-0{inset:0}.pointer-events-none{pointer-events:none}</style><div id="root"></div><script src="/app.js"></script>');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, timeout: 10000});
        const page = await browser.newPage({viewport: {width: 1100, height: 700}});
        page.setDefaultTimeout(5000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        const leaf = number => page.locator(`[data-flipbook-page="${number}"]`);
        const style = number => leaf(number).evaluate(node => ({
            width: node.offsetWidth,
            transform: getComputedStyle(node).transform,
            visibility: getComputedStyle(node).visibility,
            backface: getComputedStyle(node).backfaceVisibility,
            origin: getComputedStyle(node).transformOrigin,
        }));
        await leaf(1).waitFor({state: 'visible'});
        await page.getByText('Next', {exact: true}).click();
        await page.waitForTimeout(180);
        const turning = await style(1);
        assert.equal(turning.width, 320);
        assert.equal(turning.visibility, 'visible');
        assert.equal(turning.backface, 'hidden');
        assert.match(turning.transform, /^matrix3d/);
        assert.match(turning.origin, /^0px/);
        await page.waitForTimeout(650);
        assert.equal((await style(1)).visibility, 'hidden');
        assert.equal((await style(2)).visibility, 'visible');
        assert.equal((await style(3)).visibility, 'visible');
        await page.getByText('Next', {exact: true}).click();
        await page.waitForTimeout(800);
        await page.getByText('Previous', {exact: true}).click();
        await page.waitForTimeout(180);
        assert.match((await style(4)).transform, /^matrix3d/);
        assert.match((await style(4)).origin, /^320px/);
        await page.waitForTimeout(650);
        assert.equal((await style(4)).visibility, 'hidden');
        assert.equal((await style(3)).visibility, 'visible');
        await page.evaluate(() => window.changeLayout(true));
        await page.getByText('Next', {exact: true}).click();
        await page.waitForTimeout(800);
        assert.equal((await style(2)).visibility, 'visible');
        assert.equal((await style(1)).visibility, 'hidden');
        assert.equal((await style(3)).visibility, 'hidden');
        await page.emulateMedia({reducedMotion: 'reduce'});
        await page.getByText('Next', {exact: true}).click();
        assert.equal((await style(2)).visibility, 'hidden');
        assert.equal((await style(3)).visibility, 'visible');
        assert.doesNotMatch((await style(3)).transform, /^matrix3d/);
        assert.deepEqual(errors, []);
    } finally {
        await browser?.close();
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
