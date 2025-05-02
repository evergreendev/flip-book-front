"use client"
import React, {HTMLAttributes, useContext, useEffect, useState} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import ModeContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/ModeContext";
import {usePdfCache} from "@/app/common/Flipbooks/hooks/PdfCacheHook";
import {Overlay} from "../types";
import Page from "@/app/common/Flipbooks/components/Page";
import {animated, to, useSpring} from "@react-spring/web";

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

    return <div className="flex justify-between items-center">
        <button onClick={(e) => {
            e.preventDefault();
            if (currPage === 1) return;
            setAnimationDirection("right");
            setCurrPage(currPage - 2);
        }} className={`text-white bg-black ${currPage === 1 ? "bg-slate-300" : ""}`}><ChevronLeft/></button>
        <div className={`overflow-hidden mx-auto my-4 h-[90vh] aspect-[28/19] flex justify-center`}>
            <div className="relative flex h-full">
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
        </div>
        <button onClick={(e) => {
            e.preventDefault();
            setCurrPage(Math.min((currPage + 2), maxPage + 1));
            setAnimationDirection("left");
        }} className={`text-white bg-black`}><ChevronRight/></button>
    </div>

}
