import {Overlay} from "@/app/common/Flipbooks/types";
import {animated, useSpring} from "@react-spring/web";
import React, {useEffect, useRef, useState} from "react";
import PDFRenderer from "@/app/common/Flipbooks/components/Page/PDFRenderer";
import OverlayRenderer from "@/app/common/Flipbooks/components/Page/OverlayRenderer";

type PageProps = {
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
}

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
               }: PageProps) => {
    const isLeft = thisPage === 1 || thisPage % 2 === 0;

    const [springs, api] = useSpring(() => ({
        from: {x: 0, width: 0, rotation: 0, transform: 'skewX(0deg)', transformOrigin: '0% 0%', zIndex: 1},
        config: {tension: 120, friction: 700, mass: 150.0}
    }))

    const [pageWidth, setPageWidth] = useState(0);


    useEffect(() => {
        if (currentPage === thisPage || (currentPage === thisPage + 1 && currentPage !== 2)) {
            if (isLeft){
                api.start({
                    to: {
                        width: pageWidth,
                    }
                })
            }
            api.start({
                from: {
                    width: 0,
                    transform: 'rotateY(10deg)',
                    transformOrigin: "right center"
                },
                to: {
                    width: pageWidth,
                    transform: 'rotateY(0deg)'
                },
            })
        } else {
            api.start({
                to: {
                    width: 0,
                    zIndex:0,
                    transform: 'rotateY(10deg)',
                    transformOrigin: "right center"
                }
            })
        }
    }, [api, currentPage, isLeft, pageWidth, thisPage]);

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
                ...springs,
            }}
        >
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

export default Page;
