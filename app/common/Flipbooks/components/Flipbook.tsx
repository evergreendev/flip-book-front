"use client"
import React, {useContext, useEffect, useRef, useState} from "react";
import HTMLFlipBook from "react-pageflip";
import {PDFDocumentProxy, RenderTask} from "pdfjs-dist";
import {RenderParameters} from "pdfjs-dist/types/src/display/api";
import {ChevronLeft, ChevronRight} from "lucide-react";
import ModeContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/ModeContext";
import { useRouter } from 'next/navigation'

async function processOverlays(
    currPage: number,
    pdf: PDFDocumentProxy,
    mode: { flipBookId: string; }) {
    const page = await pdf.getPage(currPage);
    const structureTree = await page.getTextContent();

    const newOverlays: Overlay[] = [];

    structureTree.items.forEach((item) => {

        if (!("str" in item)) return;

        if (item.str.toLowerCase().includes(".com")
            || item.str.toLowerCase().includes(".fun")
            || item.str.toLowerCase().includes(".edu")
            || item.str.toLowerCase().includes(".net")
            || item.str.toLowerCase().includes(".org")) {
            const transform = item.transform;
            const x = transform[4];
            const y = transform[5];
            const width = item.width;
            const height = item.height;

            newOverlays.push({
                flipbook_id: mode.flipBookId,
                h: height,
                id: null,
                page: currPage,
                url: item.str,
                w: width,
                x: x,
                y: y
            })
        }
    })

    return newOverlays;
}


// eslint-disable-next-line react/display-name
const Page = React.forwardRef(({currPage, pdfUrl, shouldRender, overlays, setOverlays}: {
    currPage: number,
    pdfUrl: string,
    shouldRender?: boolean,
    overlays: Overlay[][],
    setOverlays: (value: Overlay[][]) => void,
}, ref: React.ForwardedRef<HTMLDivElement>) => {
    const mode = useContext(ModeContext);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<RenderTask>(null);
    const pdfRef = useRef<PDFDocumentProxy>(null);
    const currOverlays = overlays[currPage-1];

    function renderOverlay(canvas:HTMLCanvasElement, hideOverlays:boolean){
        const overlayContext = canvas.getContext('2d');
        function convertToCanvasCoords([x, y, width, height]: [number, number, number, number]) {
            const scale = 1.5;
            return [x * scale, canvas.height - ((y + height) * scale), width * scale, height * scale];
        }
        if (overlayContext && currOverlays?.length > 0) {
            overlayContext.clearRect(0, 0, canvas.width, canvas.height);
            overlayContext.fillStyle = "#66cc33";
            overlayContext.globalAlpha = hideOverlays ? 0 : .5;

            currOverlays.forEach(overlay => {
                // @ts-expect-error silly tuple nonsense
                overlayContext.fillRect(...convertToCanvasCoords([overlay.x, overlay.y, overlay.w, overlay.h]))
            })


            overlayContext.globalAlpha = 1;

            //canvasContext.fillStyle = "orange";
            //canvasContext.fillRect(20, 50, canvas.width, canvas.height);
        }
    }

    useEffect(() => {
        let isCancelled = false;
        const canvas = canvasRef.current;
        const overlayCanvas = overlayRef.current;
        let pdf: PDFDocumentProxy;

        if (!shouldRender) return async () => {
            isCancelled = true;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
            const ctx = canvas?.getContext("2d");

            if (!canvas || !ctx || !overlayCanvas) return;

            canvas.height = 1024;
            canvas.width = 768;
            overlayCanvas.height = 1024;
            overlayCanvas.width = 768;

            ctx.fillStyle = "#58ca70";
            ctx.fillRect(0, 0, canvas.width, canvas.height);//todo add loading
            ctx.fillStyle = "#75b543";
        }

        async function renderPage(canvas: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement) {
            try {
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
                const canvas2 = overlayCanvas;
                const canvasContext = canvas1.getContext('2d');
                canvas1.height = viewport.height;
                canvas2.height = viewport.height;
                canvas1.width = viewport.width;
                canvas2.width = viewport.width;

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

                if (!isCancelled) {
                    await pdf.destroy();
                }
            } catch (e) {
                console.log(e)
            } finally {
                await pdf.destroy();
            }

        }

        (async function () {
            if (!canvasRef.current||!overlayRef.current) return;
            await renderPage(canvasRef.current, overlayRef.current);
            renderOverlay(overlayRef.current, true);
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
    }, [currPage, mode.flipBookId, mode.mode, overlays, pdfUrl, setOverlays, shouldRender]);

    function findInsideOverlay(position:number[], overlays:Overlay[]){
        if (!overlays) return;
        return overlays.find(overlay => {
            const left = overlay.x;
            const right = overlay.x + overlay.w;
            const bottom = overlay.y;
            const top = overlay.y + overlay.h;
            return position[0] > left && position[0] < right && position[1] > bottom && position[1] < top;
        })
    }
    const router = useRouter();
    function handleMouse(e: React.MouseEvent) {
        e.preventDefault();
        if (!overlayRef.current) return;
        renderOverlay(overlayRef.current,false);
        const canvas = overlayRef.current;

        function translateCoordinates(e:React.MouseEvent) {
            const transform = window.getComputedStyle(canvas).transform;
            const matrix = new DOMMatrixReadOnly(transform);
            const invertedMatrix = matrix.inverse();

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = rect.bottom - e.clientY;
            const canvasScaledHeight = canvas.height/1.5;
            const canvasScaledWidth = canvas.width/1.5;
            const widthAdjust = canvas.getBoundingClientRect().width/canvasScaledWidth;
            const heightAdjust = canvas.getBoundingClientRect().height/canvasScaledHeight;

            const transformedPoint = invertedMatrix.transformPoint({ x: mouseX, y: mouseY });
            const adjustedX = transformedPoint.x/widthAdjust;
            const adjustedY = transformedPoint.y/heightAdjust;

            return [adjustedX, adjustedY];
        }

        const insideOverlay = findInsideOverlay(translateCoordinates(e), currOverlays);
        if (insideOverlay){
            if (e.type === "click"){
                router.push(insideOverlay.url);
            }
        }
    }
    function handleMouseExit(e: React.MouseEvent){
        e.preventDefault();
        if (!overlayRef.current) return;
        renderOverlay(overlayRef.current,true);
    }

    return (
        <div ref={ref}>
            <canvas ref={canvasRef}/>
            <canvas ref={overlayRef} onMouseLeave={handleMouseExit} onClick={handleMouse} onMouseMove={handleMouse}/>
        </div>
    );
});

export type Overlay = {
    id: string | null,
    flipbook_id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    url: string,
    page: number
}

export default function Flipbook({pdfUrl, initialOverlays, setFormOverlays}: {
    pdfUrl: string,
    initialOverlays: Overlay[] | null,
    setFormOverlays?: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void
}) {
    const formattedInitialOverlays: Overlay[][] = [];
    if (initialOverlays && initialOverlays?.length > 0) {
        initialOverlays.forEach(overlay => {
            if (formattedInitialOverlays[overlay.page-1]){
                formattedInitialOverlays[overlay.page-1].push(overlay);
            } else {
                formattedInitialOverlays[overlay.page-1] = [overlay];
            }
        })
    }

    const [maxPage, setMaxPage] = useState<number|null>(null);
    const [currPage, setCurrPage] = useState(1);
    const [renderedPages, setRenderedPages] = useState(new Set<number>());
    const [overlays, setOverlays] = useState<Overlay[][]>(formattedInitialOverlays);
    const mode = useContext(ModeContext);
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


            if (initialOverlays?.length === 0 && mode.mode === "edit" && setFormOverlays){
                const initialOverlayArray: React.SetStateAction<Overlay[][]> = [];

                for (let i = 0; i < pdf.numPages; i++) {
                    const overlays = await processOverlays(i+1, pdf, mode);
                    initialOverlayArray.push(overlays);
                }

                setOverlays(initialOverlayArray);
                setFormOverlays(initialOverlayArray.flatMap(x => x));
            }

            setMaxPage(pdf.numPages);

            await pdf.destroy();
        })();

        // Cleanup function to cancel the render task if the component unmounts.
        return () => {
            if (pdf) {
                pdf.destroy();
            }
        };
    }, [pdfUrl]);

    useEffect(() => {
        if (!maxPage) return;

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
    }, [maxPage, currPage]);

    if (!maxPage) return null;

    return <div className="flex justify-between items-center">
        <button onClick={() => {
            if (!book.current) return;
            // @ts-expect-error I'm not looking up the type for this
            book.current.pageFlip().flipPrev();
        }} className="text-white"><ChevronLeft/></button>
        <div className={`overflow-hidden mx-auto my-4 h-[90vh] aspect-[28/19]`}>
            {/*        <button onClick={() =>
            book.current.pageFlip().flipNext()}>Next page
        </button>*/}

            {/* @ts-expect-error Ignore required attributes since they're not really required*/}
            <HTMLFlipBook
                width={550}
                          height={733}
                          size="stretch"
                          minWidth={315}
                          minHeight={400}
                          maxShadowOpacity={0.5}
                          showCover={true}
                          onFlip={(page: { data: number }) => {
                              setCurrPage(page.data);
                          }}
                          mobileScrollSupport={true}
                          ref={book}>
                {Array.from({length: maxPage}).map((_, index) => {
                    return (
                        <Page setOverlays={setOverlays} overlays={overlays} key={index} currPage={index + 1}
                              pdfUrl={pdfUrl} shouldRender={renderedPages.has(index)}/>
                    );
                })}
            </HTMLFlipBook>
        </div>
        <button onClick={() => {
            if (!book.current) return;
            // @ts-expect-error I'm not looking up the type for this
            book.current.pageFlip().flipNext();
        }} className="text-white"><ChevronRight/></button>
    </div>

}
