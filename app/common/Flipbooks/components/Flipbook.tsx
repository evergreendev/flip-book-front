"use client"
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {v4 as uuidv4} from 'uuid';
import {ChevronLeft, ChevronRight} from "lucide-react";
import ModeContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/ModeContext";
import {useRouter} from 'next/navigation'
import {usePdfCache} from "@/app/common/Flipbooks/hooks/PdfCacheHook";
import PDFRenderer from "@/app/common/Flipbooks/components/PDFRenderer";
import {animated, useSpring} from '@react-spring/web'

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



const Page = (({
                                   thisPage,
                                   currentPage,
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
    thisPage: number,
    currentPage: number,
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
}) => {
    const mode = useContext(ModeContext);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const [draggingMode, setDraggingMode] = useState<"none" | "move" | "resize">("none");
    const [activeGrip, setActiveGrip] = useState<{ overlay: Overlay, grip: string | null } | null>(null);
    const [movingOverlay, setMovingOverlay] = useState<Overlay | null>(null);

    const renderOverlay = useCallback((canvas: HTMLCanvasElement, hideOverlays: boolean) => {
        const overlayContext = canvas.getContext('2d');
        const currOverlays = overlays[thisPage - 1];

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
                if (mode.activeTool !== "delete" && activeOverlayId === overlay.id) {
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
    }, [overlays, thisPage, mode.activeTool, mode.mode, activeOverlayId]);

    //overlay render effect
    useEffect(() => {
        (async function () {
            if (!overlayRef.current) return;
            renderOverlay(overlayRef.current, mode.mode !== "edit");
        })();
    }, [mode.mode, renderOverlay]);


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
            page: thisPage
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
    }, [thisPage, formOverlays, mode.flipBookId, setActiveOverlayId, setFormOverlays, setOverlays]);

    function handleMouse(e: React.MouseEvent) {
        e.preventDefault();

        if (!overlayRef.current) return;
        renderOverlay(overlayRef.current, false);
        const canvas = overlayRef.current;
        const currOverlays = overlays ? overlays[thisPage - 1] : [];

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


        if (draggingMode === "resize" && activeGrip && mode.mode === "edit" && (mode.activeTool === "edit" || mode.activeTool === "create")) {
            const [mouseX, mouseY] = translateCoordinates(e);
            const index = currOverlays.findIndex(o => o.id === activeGrip.overlay.id);
            if (index !== -1) {
                const updatedDimensions = updateOverlayDimensions(activeGrip.grip!, activeGrip.overlay, mouseX, mouseY);
                const updatedOverlay = {...currOverlays[index], ...updatedDimensions};
                const newOverlays = [...overlays];
                newOverlays[thisPage - 1] = [...currOverlays];
                newOverlays[thisPage - 1][index] = updatedOverlay;
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
            if (mode.mode === "edit" && !insideGrip && draggingMode === "move" && movingOverlay && (mode.activeTool === "edit" || mode.activeTool === "create")) {
                const [mouseX, mouseY] = translateCoordinates(e);
                const index = currOverlays.findIndex(o => o.id === movingOverlay.id);
                if (index !== -1) {
                    const updatedOverlay = {...currOverlays[index]};
                    updatedOverlay.x = mouseX - (updatedOverlay.w / 2);
                    updatedOverlay.y = mouseY - (updatedOverlay.h / 2);
                    const newOverlays = [...overlays];
                    newOverlays[thisPage - 1] = [...currOverlays];
                    newOverlays[thisPage - 1][index] = updatedOverlay;
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
                        if (setOverlays && activeOverlayId === insideOverlay.id) {
                            setOverlays((overlays) => {
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

    const [springs, api] = useSpring(() => ({
        from: {x: 0, width: 0, rotation: 0, transform: 'skewX(0deg)', transformOrigin: '0% 0%'},
        config: {tension: 170, friction: 500, mass: 100.0}
    }))
    const [gradientSpring, gradientApi] = useSpring(() => ({
        from: {
            background: "linear-gradient(137deg,rgba(2, 0, 36, 0) 48%, rgba(47, 47, 56, 0.52) 53%, rgba(0, 212, 255, 0) 58%)",
        }
    }))

    const [pageWidth, setPageWidth] = useState(0);


    useEffect(() => {
        if (currentPage === thisPage) {
            api.start({
                from: {
                    width: 0,
                    transform: 'rotateY(90deg)',
                    transformOrigin: "right center"
                },
                to: {
                    width: pageWidth,
                    transform: 'rotateY(0deg)'
                },
            })

            gradientApi.start({
                from: {
                    background: "linear-gradient(137deg,rgba(2, 0, 36, .2) 48%, rgba(47, 47, 56, 1) 53%, rgba(0, 212, 255, .2) 58%)",
                },
                to: {
                    background: "linear-gradient(90deg, rgba(2, 0, 36, 0) 50%, rgba(47, 47, 56, 0) 97%, rgba(0, 212, 255, 0) 100%)",
                }
            })
        } else {
            api.start({
                to: {
                    width: 0,
                    transform: 'rotateY(90deg)',
                    transformOrigin: "right center"
                }
            })
        }
    }, [api, currentPage, gradientApi, pageWidth, thisPage]);

    const pageRef = useRef<HTMLDivElement>(null);
    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!pdfCanvasRef.current) return;
        const observer = new ResizeObserver(() => {
            if (!pdfCanvasRef.current) return;
                const element = pageRef.current as HTMLDivElement;
                const rect = element.getBoundingClientRect();
                const canvasWidthAdjust = rect.height / pdfCanvasRef.current.height;
                const adjustedCanvasWidth = pdfCanvasRef.current.width * canvasWidthAdjust;

                setPageWidth(adjustedCanvasWidth);
        });
        observer.observe(pdfCanvasRef.current);
        return () => observer.disconnect();
    }, [pdfCanvasRef, setPageWidth]);


    return (
        /*@ts-expect-error Type problems*/
        <animated.div
            ref={pageRef}
            className="relative w-full h-full"
            style={{
                height: "100%",
                overflow: "hidden",
                position: "absolute",
                inset: 0,
                ...springs,
            }}
        >
            {/*@ts-expect-error Type problems*/}
            <animated.div className="absolute inset-0" style={{...gradientSpring}}/>
            <PDFRenderer canvasRef={pdfCanvasRef} currPage={thisPage} pdfUrl={pdfUrl} shouldRender={shouldRender}/>
            <canvas className="inset-0 absolute" ref={overlayRef} onMouseLeave={handleMouseExit}
                    onClick={handleMouse} onMouseMove={handleMouse}/>
        </animated.div>
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
            for (let i = 0; i < maxPage; i++) {
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
            e.preventDefault();
            setCurrPage(currPage - 1);
            if (!book.current) return;
            // @ts-expect-error I'm not looking up the type for this
            book.current.pageFlip().flipPrev();
        }} className="text-white bg-black"><ChevronLeft/></button>
        <div className={`overflow-hidden mx-auto my-4 h-[90vh] aspect-[28/19] relative`}>
            {/*        <button onClick={() =>
            book.current.pageFlip().flipNext()}>Next page
        </button>*/}
            {Array.from({length: maxPage}).map((_, index) => {
                return (
                    <Page
                        currentPage={currPage}
                        overlaysToDelete={overlaysToDelete}
                        activeOverlayId={activeOverlayId}
                        setOverlaysToDelete={setOverlaysToDelete}
                        formOverlays={formOverlays} setOverlays={setOverlaysToRender}
                        setFormOverlays={setFormOverlays}
                        setActiveOverlayId={setActiveOverlayId} overlays={overlays}
                        key={index} thisPage={index + 1}
                        pdfUrl={pdfUrl} shouldRender={renderedPages.has(index)}/>
                );
            })}
        </div>
        <button onClick={(e) => {
            e.preventDefault();
            setCurrPage(currPage + 1);
            if (!book.current) return;
            // @ts-expect-error I'm not looking up the type for this
            book.current.pageFlip().flipNext();
        }} className="text-white bg-black"><ChevronRight/></button>
    </div>

}
