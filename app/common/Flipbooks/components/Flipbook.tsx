"use client"
import React, {useEffect, useRef, useState} from "react";
import HTMLFlipBook from "react-pageflip";
import {PDFDocumentProxy, RenderTask} from "pdfjs-dist";
import {RenderParameters} from "pdfjs-dist/types/src/display/api";

// eslint-disable-next-line react/display-name
const Page = React.forwardRef(({currPage, pdfUrl, shouldRender}: {
    currPage: number,
    pdfUrl: string,
    shouldRender?: boolean
}, ref: React.ForwardedRef<HTMLDivElement>) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<RenderTask>(null);
    const pdfRef = useRef<PDFDocumentProxy>(null);

    useEffect(() => {
        let isCancelled = false;
        const canvas = canvasRef.current;
        let pdf: PDFDocumentProxy;

        if (!shouldRender) return async () => {
            isCancelled = true;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
            const ctx = canvas?.getContext("2d");

            if (!canvas || !ctx) return;

            canvas.height = 1024;
            canvas.width = 768;

            ctx.fillStyle = "#58ca70";
            ctx.fillRect(0, 0, canvas.width, canvas.height);//todo add loading
            ctx.fillStyle = "#75b543";
        }

        async function renderPage(canvas: HTMLCanvasElement) {
            try{
                // Import pdfjs-dist dynamically for client-side rendering.
                // @ts-expect-error: TypeScript cannot verify dynamic import for pdfjs-dist.
                const pdfJS = await import('pdfjs-dist/build/pdf');

                // Set up the worker.
                pdfJS.GlobalWorkerOptions.workerSrc =
                    window.location.origin + '/pdf.worker.min.mjs';

                // Load the PDF document.
                pdf = await pdfJS.getDocument(pdfUrl).promise;
                pdfRef.current = pdf;

                // Get the first page.
                const page = await pdf.getPage(currPage);
                const viewport = page.getViewport({scale: 1.5});

                // Prepare the canvas.
                const canvas1 = canvas;
                const canvasContext = canvas1.getContext('2d');
                canvas1.height = viewport.height;
                canvas1.width = viewport.width;

                // Ensure no other render tasks are running.
                if (renderTaskRef.current) {
                    await renderTaskRef.current.promise;
                }

                // Render the page into the canvas.
                const renderContext = {canvasContext, viewport};
                const renderTask = page.render(renderContext as RenderParameters);

                // Store the render task.
                renderTaskRef.current = renderTask;

                // Wait for rendering to finish.
                try {
                    await renderTask.promise;
                } catch (error) {
                    // @ts-expect-error Don't need to know the error type
                    if (error.name === 'RenderingCancelledException') {
                        console.log('Rendering cancelled.');
                    } else {
                        console.error('Render error:', error);
                    }
                }

                function convertToCanvasCoords([x, y, width, height]: [number, number, number, number]) {
                    const scale = 1.5;
                    return [x * scale, canvas.height - ((y + height) * scale), width * scale, height * scale];
                }

                if (canvasContext) {
                    const structureTree = await page.getTextContent();

                    //console.log(page);
                    /*                const operatorList = await page.getOperatorList();

                                    const imgIndex = operatorList.fnArray.indexOf(OPS.paintImageXObject);
                                    const imgArgs = operatorList.argsArray[imgIndex];
                                    const data = page.objs.get(imgArgs[0]);*/

                    canvasContext.fillStyle = "orange";
                    //canvasContext.fillRect(...convertToCanvasCoords([42.76, 45.388, 699, 467]))
                    /*                console.log(OPS);
                                    console.log(operatorList);

                                    console.log(page);
                                    console.log(data);*/


                    // @ts-expect-error don't know
                    structureTree.items.forEach((item: {
                        transform: number[];
                        width: number;
                        height: number;
                        str: string
                    }) => {

                        if (item.str.toLowerCase().includes(".com") || item.str.toLowerCase().includes(".edu")) {
                            const transform = item.transform;
                            const x = transform[4];
                            const y = transform[5];
                            const width = item.width;
                            const height = item.height;
                            canvasContext.fillStyle = "orange";
                            // @ts-expect-error silly tuple nonsense
                            canvasContext.fillRect(...convertToCanvasCoords([x, y, width, height]))
                        }
                    })
                    //canvasContext.fillStyle = "orange";
                    //canvasContext.fillRect(20, 50, canvas.width, canvas.height);
                }


                if (!isCancelled) {
                    await pdf.destroy();
                }
            }catch (e){
                console.log(e)
            }finally {
                await pdf.destroy();
            }

        }

        (async function () {
            if (!canvasRef.current) return;
            await renderPage(canvasRef.current);
        })();

        // Cleanup function to cancel the render task if the component unmounts.
        return () => {
            isCancelled = true;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
            if (pdfRef.current) {
                pdfRef.current.destroy().then(() => console.log("destroyed"));
            }
        };
    }, [currPage, pdfUrl, shouldRender]);

    return (
        <div ref={ref}>
            <canvas ref={canvasRef}/>
        </div>
    );
});

export default function Flipbook({pdfUrl}: { pdfUrl: string }) {
    const [maxPage, setMaxPage] = useState(1);
    const [currPage, setCurrPage] = useState(1);
    const [renderedPages, setRenderedPages] = useState(new Set<number>());
    /*    const [width, setWidth] = useState(0);
        const [height, setHeight] = useState(0);*/

    const book = useRef(null);


    useEffect(() => {
        let pdf: PDFDocumentProxy;
        (async function () {
            // Import pdfjs-dist dynamically for client-side rendering.
            // @ts-expect-error: TypeScript cannot verify dynamic import for pdfjs-dist.
            const pdfJS = await import('pdfjs-dist/build/pdf');

            // Set up the worker.
            pdfJS.GlobalWorkerOptions.workerSrc =
                window.location.origin + '/pdf.worker.min.mjs';

            // Load the PDF document.
            pdf = await pdfJS.getDocument(pdfUrl).promise;
            setMaxPage(pdf.numPages);
            await pdf.destroy();
        })();

        // Cleanup function to cancel the render task if the component unmounts.
        return () => {
            if (pdf){
                pdf.destroy();
            }
        };
    }, [pdfUrl]);

    useEffect(() => {
        const updatedRenderedPages = new Set(renderedPages);
        updatedRenderedPages.add(currPage);
        updatedRenderedPages.add(currPage + 1);
        updatedRenderedPages.add(currPage + 2);
        updatedRenderedPages.add(currPage + 3);
        updatedRenderedPages.add(currPage + 4);
        updatedRenderedPages.add(currPage - 1);
        updatedRenderedPages.add(currPage - 2);
        updatedRenderedPages.add(currPage - 3);
        updatedRenderedPages.add(currPage - 4);

        setRenderedPages(updatedRenderedPages);
    }, [currPage]);

    return <div className="overflow-hidden py-24">
        {/*        <button onClick={() =>
            book.current.pageFlip().flipNext()}>Next page
        </button>*/}

        {/* @ts-expect-error Ignore required attributes since they're not really required*/}
        <HTMLFlipBook width={550}
                      height={733}
                      size="stretch"
                      minWidth={315}
                      maxWidth={1000}
                      minHeight={400}
                      maxHeight={1533}
                      maxShadowOpacity={0.5}
                      showCover={true}
                      onFlip={(page: { data: number }) => {
                          setCurrPage(page.data);
                      }}
                      mobileScrollSupport={true}
                      ref={book}>
            {Array.from({length: maxPage}).map((_, index) => {
                return (
                    <Page key={index} currPage={index + 1} pdfUrl={pdfUrl} shouldRender={renderedPages.has(index)}/>
                );
            })}
        </HTMLFlipBook>
    </div>;
}
