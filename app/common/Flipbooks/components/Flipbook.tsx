"use client"
import React, {HTMLAttributes, useCallback, useContext, useEffect, useState} from "react";
import ModeContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/ModeContext";
import {usePdfCache} from "@/app/common/Flipbooks/hooks/PdfCacheHook";
import {Overlay} from "../types";
import Page from "@/app/common/Flipbooks/components/Page";
import {animated, to, useSpring} from "@react-spring/web";
import Toolbar from "@/app/common/Flipbooks/components/Toolbar";

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
    const [animationDirection, setAnimationDirection] = useState<"left" | "right">("left");
    const [flipbookWidth, setFlipbookWidth] = useState<number>(0);
    const [flipbookHeight, setFlipbookHeight] = useState<number>(0);
    const [zoomLevel, setZoomLevel] = useState<number>(1.0);
    const [panPosition, setPanPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState<boolean>(false);
    const mode = useContext(ModeContext);

    const [gradientSpring, gradientApi] = useSpring(() => ({
        from: {
            rotation: 0,
            g1: 0,
            g2: 0,
            g3: 0,
        },
        to: {
            rotation: 45,
            g1: 1,
            g2: 1,
            g3: 1,
        }
    }));

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


    const handleMouseDown = () => {
        // Only enable panning if:
        // 1. Zoom level is greater than 1.0
        // 2. The target is not an overlay canvas (which needs its own interactions)
        if (zoomLevel > 1.0) {
            setIsPanning(true);
        }
    };

    // Function to constrain pan position within reasonable bounds
    const constrainPanPosition = useCallback((x: number, y: number): { x: number, y: number } => {
        // Calculate the maximum pan distance based on zoom level and flipbook dimensions
        const maxPanX = Math.max(0, flipbookWidth * (zoomLevel - 1) / 2);
        const maxPanY = Math.max(0, flipbookHeight * (zoomLevel - 1) / 2);

        return {
            x: Math.max(-maxPanX, Math.min(maxPanX, x)),
            y: Math.max(-maxPanY, Math.min(maxPanY, y))
        };
    }, [flipbookWidth, flipbookHeight, zoomLevel]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only update pan position if actively panning
        if (isPanning && zoomLevel > 1.0) {
            setPanPosition(prev => {
                const newPos = {
                    x: prev.x + e.movementX,
                    y: prev.y + e.movementY
                };
                return constrainPanPosition(newPos.x, newPos.y);
            });
            // Prevent default behavior to avoid text selection during panning
            e.preventDefault();
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Reset pan position when zoom level is reset to 1.0
    // or constrain it when zoom level changes
    useEffect(() => {
        if (zoomLevel === 1.0) {
            setPanPosition({ x: 0, y: 0 });
        } else {
            // Constrain the current pan position based on the new zoom level
            setPanPosition(prev => constrainPanPosition(prev.x, prev.y));
        }
    }, [zoomLevel, flipbookWidth, flipbookHeight, constrainPanPosition]);

    const flipbookRef = useCallback((node: HTMLDivElement) => {
        if (node !== null) {
            // This runs when the DOM node is available
            const rect = node.getBoundingClientRect();
            setFlipbookWidth(rect.width);
            setFlipbookHeight(rect.height);

            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    setFlipbookWidth(entry.contentRect.width);
                    setFlipbookHeight(entry.contentRect.height);
                }
            });

            resizeObserver.observe(node);

            // Store the observer to disconnect it later
            const currentObserver = resizeObserver;
            return () => currentObserver.disconnect();
        }
    }, []);

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
    // Effect to trigger gradient animation when current page changes
    useEffect(() => {
        if (animationDirection === "left") {
            gradientApi.start({
                to: {
                    g1: 0,
                    g2: 0,
                    g3: 0,
                    rotation: 90
                },
                from: {
                    g1: 68,
                    g2: 80,
                    g3: 93,
                    rotation: 133
                },

            });
        } else {
            gradientApi.start({
                from: {
                    g1: 0,
                    g2: 7,
                    g3: 23,
                    rotation: 136
                },
                to: {
                    g1: 100,
                    g2: 100,
                    g3: 100,
                    rotation: 90
                },
            });
        }

    }, [animationDirection, currPage, gradientApi]);

    if (!maxPage) return null;

    return <div className="flex justify-between items-center flex-wrap bg-white">
        <div 
            ref={flipbookRef} 
            className={`overflow-hidden mx-auto my-4 h-[90vh] aspect-[28/19] flex justify-center`}
            style={{ cursor: isPanning ? 'grabbing' : (zoomLevel > 1.0 ? 'grab' : 'default') }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
        <div 
            className="relative flex h-full"
            style={{
                transform: zoomLevel > 1.0 ? `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)` : 'none',
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.2s ease-out'
            }}
        >
                <animated.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        zIndex: 3,
                        position: "absolute",
                        background: to(
                            [gradientSpring.rotation, gradientSpring.g1, gradientSpring.g2, gradientSpring.g3],
                            (rotation, g1, g2, g3) => `linear-gradient(${rotation}deg,rgba(2, 0, 36, 0) ${g1}%, rgba(255,255,255, 1) ${g2}%, rgba(0, 212, 255, 0) ${g3}%)`
                        )
                    }}
                    {...({} as HTMLAttributes<HTMLDivElement>)}
                />
                {Array.from({length: maxPage}).map((_, index) => {
                    return (
                        <Page
                            flipBookWidth={flipbookWidth}
                            flipBookHeight={flipbookHeight}
                            currentPage={currPage}
                            overlaysToDelete={overlaysToDelete}
                            activeOverlayId={activeOverlayId}
                            setOverlaysToDelete={setOverlaysToDelete}
                            formOverlays={formOverlays} setOverlays={setOverlaysToRender}
                            setFormOverlays={setFormOverlays}
                            setActiveOverlayId={setActiveOverlayId} overlays={overlays}
                            maxPage={maxPage}
                            key={index} thisPage={index + 1}
                            pdfUrl={pdfUrl} shouldRender={renderedPages.has(index)}
                            zoomLevel={zoomLevel}/>
                    );
                })}
            </div>
        </div>
        <div className="w-full">
            <Toolbar setAnimationDirection={setAnimationDirection} setPage={setCurrPage} setZoomLevel={setZoomLevel} currentPage={currPage} totalPages={maxPage}
                     currentZoom={zoomLevel}/>
        </div>

    </div>

}
