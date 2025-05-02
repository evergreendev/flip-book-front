"use client"
import React, {useContext, useEffect, useRef, useState} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import ModeContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/ModeContext";
import {usePdfCache} from "@/app/common/Flipbooks/hooks/PdfCacheHook";
import PDFRenderer from "@/app/common/Flipbooks/components/PDFRenderer";
import OverlayRenderer from "@/app/common/Flipbooks/components/OverlayRenderer";
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
            <OverlayRenderer 
                thisPage={thisPage}
                overlays={overlays}
                activeOverlayId={activeOverlayId}
                formOverlays={formOverlays}
                setOverlays={setOverlays}
                setFormOverlays={setFormOverlays}
                setActiveOverlayId={setActiveOverlayId}
                setOverlaysToDelete={setOverlaysToDelete}
                pdfCanvasRef={pdfCanvasRef}
            />
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
