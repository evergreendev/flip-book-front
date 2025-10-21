import {Overlay} from "@/app/common/Flipbooks/types";
import {animated, to, useSpring} from "@react-spring/web";
import React, {useContext, useEffect, useRef, useState} from "react";
import PDFRenderer from "@/app/common/Flipbooks/components/Page/PDFRenderer";
import OverlayRenderer from "@/app/common/Flipbooks/components/Page/OverlayRenderer";
import {useScreenSize} from "@/app/common/Flipbooks/hooks/useScreenSize";
import {addImpression} from "@/app/common/Analytics/actions";
import editorContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/EditorContext";

interface PageProps {
    thisPage: number
    currentPage: number
    pdfUrl: string
    shouldRender?: boolean
    overlays: Overlay[][]
    overlaysToDelete?: string[]
    formOverlays?: Overlay[] | null
    flipBookWidth: number
    flipBookHeight: number
    maxPage?: number | null
    zoomLevel: number
    renderedPageUrl: string
    setOverlays?: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void
    setFormOverlays?: (value: Overlay[]) => void
    setRenderedPages: React.Dispatch<React.SetStateAction<Set<number>>>
    setOverlaysToDelete?: (value: (((prevState: string[]) => string[]) | string[])) => void
    shouldClearQueue: boolean,
    flipbookId: string,
}

const Page = (({
                   thisPage,
                   currentPage,
                   pdfUrl,
                   shouldRender,
                   overlays,
                   flipBookWidth,
                   flipBookHeight,
                   formOverlays,
                   maxPage,
                   zoomLevel,
                   renderedPageUrl,
                   setOverlays,
                   setFormOverlays,
                   setRenderedPages,
                   setOverlaysToDelete,
                   shouldClearQueue,
    flipbookId,
               }: PageProps) => {
    // Determine if the page is on the left side of the spread
    const isLeft = thisPage === 1 || thisPage % 2 === 0;
    const [canvasWidth, setCanvasWidth] = useState(0);
    const [canvasHeight, setCanvasHeight] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const editorInfo = useContext(editorContext);

    // Determine page position based on page number
    const pagePosition = isLeft ? "left" : "right";

    const [springs, api] = useSpring(() => ({
        from: {width: 0, rotate: 0, transformOrigin: '0% 0%', zIndex: 1},
    }))


    const {isBelow1000px} = useScreenSize();

    const [pageWidth, setPageWidth] = useState(isBelow1000px ? flipBookWidth : flipBookWidth / 2);

    useEffect(() => {
        setPageWidth(isBelow1000px ? flipBookWidth : flipBookWidth / 2);
    }, [pageWidth, flipBookWidth, isBelow1000px]);

    useEffect(() => {
        if (currentPage === thisPage || (!isBelow1000px && (currentPage === thisPage + 1 && currentPage !== 2 && currentPage !== maxPage))) {
            if (editorInfo.mode !== "edit") {
                addImpression(flipbookId, "page", thisPage-1)
            }


            if (isLeft) {
                api.start({
                    to: {
                        width: canvasWidth,
                        transformOrigin: "right center"
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
                    width: canvasWidth,
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
    }, [api, canvasWidth, currentPage, editorInfo.mode, flipbookId, isBelow1000px, isLeft, maxPage, pageWidth, thisPage]);

    const pageRef = useRef<HTMLDivElement>(null);
    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

    return (
        /*@ts-expect-error Type problems*/
        <animated.div
            ref={pageRef}
            className={`relative w-full h-full flex flex-col justify-center items-center`}
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
                renderedPageUrl={renderedPageUrl}
                flipbookHeight={flipBookHeight}
                flipbookWidth={flipBookWidth}
                shouldClearQueue={shouldClearQueue}
                setCanvasHeight={setCanvasHeight}
                setCanvasWidth={setCanvasWidth}
                setCanvasScale={setCanvasScale}
                canvasRef={pdfCanvasRef}
                currPage={thisPage}
                pdfUrl={pdfUrl}
                setRenderedPages={setRenderedPages}
                shouldRender={shouldRender}
                pagePosition={pagePosition}
                zoomLevel={zoomLevel}
            />
            <OverlayRenderer
                thisPage={thisPage}
                currentPage={currentPage}
                flipbookId={flipbookId}
                maxPage={maxPage}
                overlays={overlays}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                canvasScale={canvasScale}
                formOverlays={formOverlays}
                setOverlays={setOverlays}
                setFormOverlays={setFormOverlays}
                setOverlaysToDelete={setOverlaysToDelete}
                pdfCanvasRef={pdfCanvasRef}
                zoomLevel={zoomLevel}
            />
        </animated.div>
    );
});

export default Page;
