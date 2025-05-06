import {Overlay} from "@/app/common/Flipbooks/types";
import {animated, to, useSpring} from "@react-spring/web";
import React, {useEffect, useRef, useState} from "react";
import PDFRenderer from "@/app/common/Flipbooks/components/Page/PDFRenderer";
import OverlayRenderer from "@/app/common/Flipbooks/components/Page/OverlayRenderer";


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

interface PageProps {
    thisPage: number
    currentPage: number
    pdfUrl: string
    shouldRender?: boolean
    overlays: Overlay[][]
    overlaysToDelete?: string[]
    activeOverlayId?: string | null
    formOverlays?: Overlay[] | null
    flipBookWidth: number
    flipBookHeight: number
    setOverlays?: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void
    setFormOverlays?: (value: Overlay[]) => void
    setActiveOverlayId?: (value: (((prevState: (string | null)) => (string | null)) | string | null)) => void
    setOverlaysToDelete?: (value: (((prevState: string[]) => string[]) | string[])) => void
}

const Page = (({
                   thisPage,
                   currentPage,
                   pdfUrl,
                   shouldRender,
                   overlays,
                   flipBookWidth,
                   flipBookHeight,
                   activeOverlayId,
                   formOverlays,
                   setOverlays,
                   setFormOverlays,
                   setActiveOverlayId,
                   setOverlaysToDelete
               }: PageProps) => {
    // Determine if the page is on the left side of the spread
    const isLeft = thisPage === 1 || thisPage % 2 === 0;
    
    // Determine page position based on page number
    const pagePosition = isLeft ? "left" : "right";

    const [springs, api] = useSpring(() => ({
        from: {x: 0, width: 0, rotate: 0, transformOrigin: '0% 0%', zIndex: 1},
        config: {tension: 120, friction: 700, mass: 150.0}
    }))

    const [pageWidth, setPageWidth] = useState(flipBookWidth/2);

    useEffect(() => {
        setPageWidth(flipBookWidth/2);
    }, [pageWidth, flipBookWidth]);


    useEffect(() => {
        if (currentPage === thisPage || (currentPage === thisPage + 1 && currentPage !== 2)) {
            if (isLeft) {
                api.start({
                    to: {
                        width: pageWidth,
                    }
                })
            }
            api.start({
                from: {
                    width: 0,
                    rotate: -180,
                    transformOrigin: "left center"
                },
                to: {
                    width: pageWidth,
                    rotate: 0
                },
            })
        } else {
            api.start({
                to: {
                    width: 0,
                    zIndex: 0,
                    transformOrigin: "left center"
                }
            })
        }
    }, [api, currentPage, isLeft, pageWidth, thisPage]);

    const pageRef = useRef<HTMLDivElement>(null);
    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

    return (
        /*@ts-expect-error Type problems*/
        <animated.div
            ref={pageRef}
            className={`relative w-full h-full flex ${pagePosition === "left" && "justify-end"} ${pagePosition === "right" && "justify-start"}`}
            style={{
                height: "100%",
                overflow: "hidden",
                width: springs.width,
                transformOrigin: springs.transformOrigin,
                zIndex: springs.zIndex,
                transform: to(
                    [springs.rotate],
                    (rotate) => `rotateY(${rotate}deg)`
                )
            }}
        >
            <PDFRenderer 
                flipbookHeight={flipBookHeight} 
                flipbookWidth={flipBookWidth} 
                canvasRef={pdfCanvasRef}
                currPage={thisPage} 
                pdfUrl={pdfUrl} 
                shouldRender={shouldRender}
                pagePosition={pagePosition}
            />
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
