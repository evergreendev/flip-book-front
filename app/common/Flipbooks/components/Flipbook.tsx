"use client"
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {v4 as uuidv4} from 'uuid';
import HTMLFlipBook from "react-pageflip";
import {PDFDocumentProxy, RenderTask} from "pdfjs-dist";
import {RenderParameters} from "pdfjs-dist/types/src/display/api";
import {ChevronLeft, ChevronRight} from "lucide-react";
import ModeContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/ModeContext";
import {useRouter} from 'next/navigation'
import {usePdfCache} from "@/app/common/Flipbooks/hooks/PdfCacheHook";

/*async function processOverlays(
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
                url: item.str.startsWith('http') ? item.str : `https://${item.str}`,
                w: width,
                x: x,
                y: y
            })
        }
    })

    return newOverlays;
}*/


// eslint-disable-next-line react/display-name
const Page = React.forwardRef(({
                                   currPage,
                                   pdfUrl,
                                   shouldRender,
                                   overlays,
                                   activeOverlayId,
                                   formOverlays,
                                   setOverlays,
                                   setFormOverlays,
                                   setActiveOverlayId,
                                   setOverlaysToDelete
                               }: {
    currPage: number,
    pdfUrl: string,
    shouldRender?: boolean,
    overlays: Overlay[][],
    overlaysToDelete?: string[],
    activeOverlayId?: string | null,
    formOverlays?: Overlay[] | null,
    setOverlays?: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void,
    setFormOverlays?: (value: Overlay[]) => void,
    setActiveOverlayId?: (value: (((prevState: (string | null)) => (string | null)) | string | null)) => void,
    setOverlaysToDelete?: (value: (((prevState: string[]) => string[]) | string[])) => void
}, ref: React.ForwardedRef<HTMLDivElement>) => {
    const mode = useContext(ModeContext);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<RenderTask>(null);
    const pdfRef = useRef<PDFDocumentProxy>(null);
    const [draggingMode, setDraggingMode] = useState<"none" | "move" | "resize">("none");
    const [activeGrip, setActiveGrip] = useState<{ overlay: Overlay, grip: string | null } | null>(null);
    const [movingOverlay, setMovingOverlay] = useState<Overlay | null>(null);

    const renderOverlay = useCallback((canvas: HTMLCanvasElement, hideOverlays: boolean) => {
        const overlayContext = canvas.getContext('2d');
        const currOverlays = overlays[currPage - 1];

        function convertToCanvasCoords([x, y, width, height]: [number, number, number, number]) {
            const scale = 1.5;
            return [x * scale, canvas.height - ((y + height) * scale), width * scale, height * scale];
        }

        if (overlayContext && currOverlays?.length > 0) {
            overlayContext.clearRect(0, 0, canvas.width, canvas.height);
            overlayContext.fillStyle = "#66cc33";

            overlayContext.globalAlpha = hideOverlays ? 0 : .5;

            currOverlays.forEach(overlay => {
                if (mode.activeTool === "delete" && activeOverlayId === overlay.id) {
                    overlayContext.fillStyle = "#e41919";
                }
                if (mode.activeTool !== "delete" && activeOverlayId === overlay.id){
                    overlayContext.fillStyle = "#338ccc";
                }
                // @ts-expect-error silly tuple nonsense
                overlayContext.fillRect(...convertToCanvasCoords([overlay.x, overlay.y, overlay.w, overlay.h]))

                if (mode.mode === "edit") {//render grips if in edit mode
                    overlayContext.fillStyle = "#ccb333";
                    overlayContext.globalAlpha = 1;
                    const gripSize = 8;
                    // @ts-expect-error silly tuple nonsense
                    overlayContext.fillRect(...convertToCanvasCoords([overlay.x - gripSize / 2, overlay.y - gripSize / 2, gripSize, gripSize]))
                    // @ts-expect-error silly tuple nonsense
                    overlayContext.fillRect(...convertToCanvasCoords([overlay.x - ((gripSize / 2) - overlay.w), overlay.y - gripSize / 2, gripSize, gripSize]))
                    // @ts-expect-error silly tuple nonsense
                    overlayContext.fillRect(...convertToCanvasCoords([overlay.x - gripSize / 2, overlay.y - ((gripSize / 2) - overlay.h), gripSize, gripSize]))
                    // @ts-expect-error silly tuple nonsense
                    overlayContext.fillRect(...convertToCanvasCoords([overlay.x - ((gripSize / 2) - overlay.w), overlay.y - ((gripSize / 2) - overlay.h), gripSize, gripSize]))

                    overlayContext.fillStyle = "#66cc33";
                    overlayContext.globalAlpha = hideOverlays ? 0 : .5;
                }


            })


            overlayContext.globalAlpha = 1;

            //canvasContext.fillStyle = "orange";
            //canvasContext.fillRect(20, 50, canvas.width, canvas.height);
        }
    }, [overlays, currPage, mode.activeTool, mode.mode, activeOverlayId]);

    //overlay render effect
    useEffect(() => {
        (async function () {
            if (!canvasRef.current || !overlayRef.current) return;
            renderOverlay(overlayRef.current, mode.mode !== "edit");
        })();

        // Cleanup function to cancel the render task if the component unmounts.
        return () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
            if (pdfRef.current) {
                pdfRef.current.destroy().then(() => console.log("destroyed"));
            }
        };
    }, [mode.mode, renderOverlay]);

    //page render effect
    useEffect(() => {
        const isCancelled = false;
        let pdf: PDFDocumentProxy;

        const canvas = canvasRef.current;
        const overlayCanvas = overlayRef.current;

        if (!shouldRender) return async () => {
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
                await pdf?.destroy();
            }
        }

        (async function () {
            if (!canvasRef.current || !overlayRef.current) return;
            await renderPage(canvasRef.current, overlayRef.current);
        })();

        // Cleanup function to cancel the render task if the component unmounts.
        return () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
            if (pdfRef.current) {
                pdfRef.current.destroy().then(() => console.log("destroyed"));
            }
        };
    }, [currPage, pdfUrl, shouldRender]);


    function findInsideOverlay(position: number[], overlays: Overlay[]) {
        if (!overlays) return;
        return overlays.find(overlay => {
            const left = overlay.x;
            const right = overlay.x + overlay.w;
            const bottom = overlay.y;
            const top = overlay.y + overlay.h;
            return position[0] > left && position[0] < right && position[1] > bottom && position[1] < top;
        })
    }

    function findInsideGrip(position: number[], overlays: Overlay[], gripSize: number = 8) {
        if (!overlays) return;
        let grip: string | null = null;

        const foundOverlay = overlays.find(overlay => {
            const topLeft = {x: overlay.x - gripSize / 2, y: overlay.y - gripSize / 2};
            const topRight = {x: overlay.x + overlay.w - gripSize / 2, y: overlay.y - gripSize / 2};
            const bottomLeft = {x: overlay.x - gripSize / 2, y: overlay.y + overlay.h - gripSize / 2};
            const bottomRight = {x: overlay.x + overlay.w - gripSize / 2, y: overlay.y + overlay.h - gripSize / 2};

            if ((position[0] >= topLeft.x && position[0] <= topLeft.x + gripSize &&
                position[1] >= topLeft.y && position[1] <= topLeft.y + gripSize)) {
                grip = "bottomLeft";
            }
            if ((position[0] >= topRight.x && position[0] <= topRight.x + gripSize &&
                position[1] >= topRight.y && position[1] <= topRight.y + gripSize)) {
                grip = "bottomRight";
            }
            if ((position[0] >= bottomLeft.x && position[0] <= bottomLeft.x + gripSize &&
                position[1] >= bottomLeft.y && position[1] <= bottomLeft.y + gripSize)) {
                grip = "topLeft";
            }
            if ((position[0] >= bottomRight.x && position[0] <= bottomRight.x + gripSize &&
                position[1] >= bottomRight.y && position[1] <= bottomRight.y + gripSize)) {
                grip = "topRight";
            }

            if (grip) return true;
        })

        if (!foundOverlay) return null;

        return {
            overlay: foundOverlay,
            grip: grip
        }
    }

    const router = useRouter();


    function updateOverlayDimensions(grip: string, overlay: Overlay, mouseX: number, mouseY: number): Partial<Overlay> {
        switch (grip) {
            case "bottomLeft":
                return {
                    w: Math.max((overlay.w + (overlay.x - mouseX)), 0),
                    x: mouseX,
                    h: Math.max(overlay.h + (overlay.y - mouseY), 0),
                    y: mouseY
                };
            case "bottomRight":
                return {
                    w: Math.max(mouseX - overlay.x, 0),
                    h: Math.max(overlay.h + (overlay.y - mouseY), 0),
                    y: mouseY
                };
            case "topLeft":
                return {
                    w: Math.max(overlay.w + (overlay.x - mouseX), 0),
                    h: Math.max(mouseY - overlay.y, 0),
                    x: mouseX
                };
            case "topRight":
                return {
                    w: Math.max(mouseX - overlay.x, 0),
                    h: Math.max(mouseY - overlay.y, 0),
                };
            default:
                return {};
        }
    }

    const createOverlay = useCallback((mouseX: number, mouseY: number) => {
        if (!setOverlays) return;
        const updatedOverlay: Overlay = {
            id: uuidv4(),
            flipbook_id: mode.flipBookId,
            x: mouseX,
            y: mouseY,
            w: 50,
            h: 50,
            url: "",
            page: currPage
        };
        setOverlays((prevState) => {
            if (!prevState) return [updatedOverlay];
            return prevState.concat(updatedOverlay);
        });
        if (setFormOverlays) {
            setFormOverlays(formOverlays ? [...formOverlays, updatedOverlay] : [updatedOverlay]);
        }
        if (setActiveOverlayId) {
            console.log("setting active overlay id");
            setActiveOverlayId(updatedOverlay.id);
        }
    }, [currPage, formOverlays, mode.flipBookId, setActiveOverlayId, setFormOverlays, setOverlays]);

    function handleMouse(e: React.MouseEvent) {
        e.preventDefault();

        if (!overlayRef.current) return;
        renderOverlay(overlayRef.current, false);
        const canvas = overlayRef.current;
        const currOverlays = overlays ? overlays[currPage - 1] : [];

        function translateCoordinates(e: React.MouseEvent) {
            const transform = window.getComputedStyle(canvas).transform;
            const matrix = new DOMMatrixReadOnly(transform);
            const invertedMatrix = matrix.inverse();

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = rect.bottom - e.clientY;
            const canvasScaledHeight = canvas.height / 1.5;
            const canvasScaledWidth = canvas.width / 1.5;
            const widthAdjust = canvas.getBoundingClientRect().width / canvasScaledWidth;
            const heightAdjust = canvas.getBoundingClientRect().height / canvasScaledHeight;

            const transformedPoint = invertedMatrix.transformPoint({x: mouseX, y: mouseY});
            const adjustedX = transformedPoint.x / widthAdjust;
            const adjustedY = transformedPoint.y / heightAdjust;

            return [adjustedX, adjustedY];
        }

        const insideOverlay = findInsideOverlay(translateCoordinates(e), currOverlays);
        const insideGrip = findInsideGrip(translateCoordinates(e), currOverlays);

        if (insideOverlay && mode.mode !== "edit") {
            if (e.type === "click") {
                router.push(insideOverlay.url);
            }
        }

        if (e.buttons !== 1) {
            setDraggingMode("none");
            setActiveGrip(null);
        }
        if (e.buttons === 1 && draggingMode === "none" && mode.mode === "edit") {
            if (insideGrip) {
                setDraggingMode("resize");
                setActiveGrip(insideGrip);
                setMovingOverlay(null);
            } else if (insideOverlay) {
                setDraggingMode("move");
                setActiveGrip(null);
                setMovingOverlay(insideOverlay);
            }
        }


        if (draggingMode === "resize" && activeGrip && mode.mode === "edit" && (mode.activeTool === "edit"|| mode.activeTool === "create")) {
            const [mouseX, mouseY] = translateCoordinates(e);
            const index = currOverlays.findIndex(o => o.id === activeGrip.overlay.id);
            if (index !== -1) {
                const updatedDimensions = updateOverlayDimensions(activeGrip.grip!, activeGrip.overlay, mouseX, mouseY);
                const updatedOverlay = {...currOverlays[index], ...updatedDimensions};
                const newOverlays = [...overlays];
                newOverlays[currPage - 1] = [...currOverlays];
                newOverlays[currPage - 1][index] = updatedOverlay;
                if (setOverlays) {
                    setOverlays((overlays) => {
                        if (!overlays) return overlays;
                        return overlays.map((overlay) => {
                            if (overlay.id === activeGrip.overlay.id) {
                                return {...overlay, ...updatedDimensions}
                            }
                            return overlay
                        })
                    });
                }


                if (!setFormOverlays) return;

                if (formOverlays) {
                    const existingOverlayToUpdate = formOverlays.find(overlay => overlay.id === activeGrip.overlay.id);
                    setFormOverlays(existingOverlayToUpdate ? formOverlays.map(overlay => {
                        if (overlay.id === activeGrip.overlay.id) {
                            return {...overlay, ...updatedDimensions}
                        }
                        return overlay
                    }) : formOverlays.concat([{...activeGrip.overlay, ...updatedDimensions}]));
                    return;
                }

                setFormOverlays([{...activeGrip.overlay, ...updatedDimensions}]);
            }
        } else {
            if (mode.mode === "edit" && !insideGrip && draggingMode === "move" && movingOverlay && (mode.activeTool === "edit"||mode.activeTool === "create")) {
                const [mouseX, mouseY] = translateCoordinates(e);
                const index = currOverlays.findIndex(o => o.id === movingOverlay.id);
                if (index !== -1) {
                    const updatedOverlay = {...currOverlays[index]};
                    updatedOverlay.x = mouseX - (updatedOverlay.w / 2);
                    updatedOverlay.y = mouseY - (updatedOverlay.h / 2);
                    const newOverlays = [...overlays];
                    newOverlays[currPage - 1] = [...currOverlays];
                    newOverlays[currPage - 1][index] = updatedOverlay;
                    if (setOverlays) {
                        setOverlays((overlays) => {
                            if (!overlays) return overlays;

                            return overlays.map((overlay) => {
                                if (overlay.id === movingOverlay.id) {
                                    return {...overlay, x: updatedOverlay.x, y: updatedOverlay.y}
                                }
                                return overlay
                            })
                        });
                    }

                    if (!setFormOverlays) return;

                    if (formOverlays) {
                        const existingOverlayToUpdate = formOverlays.find(overlay => overlay.id === movingOverlay.id);
                        setFormOverlays(existingOverlayToUpdate ? formOverlays.map(overlay => {
                            if (overlay.id === movingOverlay.id) {
                                return {...overlay, x: updatedOverlay.x, y: updatedOverlay.y}
                            }
                            return overlay
                        }) : formOverlays.concat([{...movingOverlay, x: updatedOverlay.x, y: updatedOverlay.y}]))

                        return;
                    }

                    setFormOverlays([{...movingOverlay, x: updatedOverlay.x, y: updatedOverlay.y}]);
                }
            }

            if (setActiveOverlayId && e.type === "click") {
                if (insideOverlay) {
                    setActiveOverlayId(insideOverlay.id);
                    if (mode.activeTool === "delete") {
                        if (setOverlaysToDelete && activeOverlayId && activeOverlayId === insideOverlay.id) {
                            setOverlaysToDelete((overlays) => overlays.concat([activeOverlayId]));
                        }
                        if (setFormOverlays && formOverlays && activeOverlayId === insideOverlay.id) {
                            setFormOverlays(formOverlays.filter(overlay => overlay.id !== activeOverlayId));
                        }
                        if (setOverlays && activeOverlayId === insideOverlay.id){
                            setOverlays((overlays)=>{
                                if (!overlays) {
                                    return overlays
                                }
                                return overlays.filter(overlay => overlay.id !== activeOverlayId)
                            })
                        }

                    }
                } else {
                    setActiveOverlayId(null);
                    if (mode.activeTool === "create") {
                        const [mouseX, mouseY] = translateCoordinates(e);
                        createOverlay(mouseX, mouseY);
                    }
                }
            }
        }
    }

    function handleMouseExit(e: React.MouseEvent) {
        e.preventDefault();
        if (!overlayRef.current) return;
        renderOverlay(overlayRef.current, true);
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

export default function Flipbook({
                                     pdfUrl,
                                     initialOverlays,
                                     formOverlays,
                                     overlaysToDelete,
                                     activeOverlayId,
                                     setFormOverlays,
                                     setActiveOverlayId,
                                     setOverlaysToDelete,
                                     setOverlaysToRender
                                 }: {
    pdfUrl: string,
    initialOverlays: Overlay[] | null,
    setFormOverlays?: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void,
    formOverlays?: Overlay[] | null,
    overlaysToDelete?: string[],
    activeOverlayId?: string | null,
    setActiveOverlayId?: (value: (((prevState: (string | null)) => (string | null)) | string | null)) => void,
    setOverlaysToDelete?: (value: (((prevState: string[]) => string[]) | string[])) => void,
    setOverlaysToRender?: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void
}) {
    const formattedInitialOverlays: Overlay[][] = [];
    if (initialOverlays && initialOverlays?.length > 0) {
        initialOverlays.forEach(overlay => {
            if (formattedInitialOverlays[overlay.page - 1]) {
                formattedInitialOverlays[overlay.page - 1].push(overlay);
            } else {
                formattedInitialOverlays[overlay.page - 1] = [overlay];
            }
        })
    }

    const [maxPage, setMaxPage] = useState<number | null>(null);
    const [currPage, setCurrPage] = useState(1);
    const [renderedPages, setRenderedPages] = useState(new Set<number>());
    const [overlays, setOverlays] = useState<Overlay[][]>(formattedInitialOverlays);
    const mode = useContext(ModeContext);
    /*    const [width, setWidth] = useState(0);
        const [height, setHeight] = useState(0);*/


    const book = useRef(null);

    const {loadPdf, prefetchPdf} = usePdfCache();

    useEffect(() => {
        let isMounted = true;

        (async function () {
            try {
                // Use the cached PDF loader
                const pdf = await loadPdf(pdfUrl);

                if (!isMounted) return;

/*                if (initialOverlays?.length === 0 && mode.mode === "edit" && setFormOverlays) {
                    const initialOverlayArray: React.SetStateAction<Overlay[][]> = [];

                    for (let i = 0; i < pdf.numPages; i++) {
                        const overlays = await processOverlays(i + 1, pdf, mode);
                        initialOverlayArray.push(overlays);
                    }

                    setOverlays(initialOverlayArray);
                    setFormOverlays(initialOverlayArray.flatMap(x => x));
                }*/

                setMaxPage(pdf.numPages);

                // Prefetch the next few pages
                for (let i = 1; i <= Math.min(5, pdf.numPages); i++) {
                    prefetchPdf(pdfUrl);
                }
            } catch (error) {
                console.error("Error loading PDF:", error);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [pdfUrl, initialOverlays, mode, setFormOverlays, loadPdf, prefetchPdf]);


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

    useEffect(() => {
        if (initialOverlays && maxPage) {
            const formattedOverlays: Overlay[][] = [];
            for (let i = 0; i < maxPage; i++){
                formattedOverlays.push([]);
            }
            initialOverlays.forEach(overlay => {
                if (formattedOverlays[overlay.page - 1]) {
                    formattedOverlays[overlay.page - 1].push(overlay);
                } else {
                    formattedOverlays[overlay.page - 1] = [overlay];
                }
            });
            setOverlays(formattedOverlays);
        }
    }, [initialOverlays, maxPage]);


    if (!maxPage) return null;

    return <div className="flex justify-between items-center">
        <button onClick={(e) => {
            e.preventDefault();
            if (!book.current) return;
            // @ts-expect-error I'm not looking up the type for this
            book.current.pageFlip().flipPrev();
        }} className="text-white bg-black"><ChevronLeft/></button>
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
                disableFlipByClick={true}
                showPageCorners={false}
                useMouseEvents={mode.mode !== "edit"}
                showCover={true}
                onFlip={(page: { data: number }) => {
                    setCurrPage(page.data);
                }}
                mobileScrollSupport={true}
                ref={book}>
                {Array.from({length: maxPage}).map((_, index) => {
                    return (
                        <Page
                            overlaysToDelete={overlaysToDelete}
                            activeOverlayId={activeOverlayId}
                            setOverlaysToDelete={setOverlaysToDelete}
                            formOverlays={formOverlays} setOverlays={setOverlaysToRender}
                            setFormOverlays={setFormOverlays}
                            setActiveOverlayId={setActiveOverlayId} overlays={overlays}
                            key={index} currPage={index + 1}
                            pdfUrl={pdfUrl} shouldRender={renderedPages.has(index)}/>
                    );
                })}
            </HTMLFlipBook>
        </div>
        <button onClick={(e) => {
            e.preventDefault();
            if (!book.current) return;
            // @ts-expect-error I'm not looking up the type for this
            book.current.pageFlip().flipNext();
        }} className="text-white bg-black"><ChevronRight/></button>
    </div>

}
