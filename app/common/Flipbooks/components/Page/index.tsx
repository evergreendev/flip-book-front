import {Overlay} from "@/app/common/Flipbooks/types";
import {animated, to, useSpring} from "@react-spring/web";
import React, {useEffect, useRef, useState} from "react";
import PDFRenderer from "@/app/common/Flipbooks/components/Page/PDFRenderer";
import OverlayRenderer from "@/app/common/Flipbooks/components/Page/OverlayRenderer";
import {useScreenSize} from "@/app/common/Flipbooks/hooks/useScreenSize";

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
    maxPage?: number | null
    zoomLevel: number
    setOverlays?: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void
    setFormOverlays?: (value: Overlay[]) => void
    setRenderedPages: React.Dispatch<React.SetStateAction<Set<number>>>
    setActiveOverlayId?: (value: (((prevState: (string | null)) => (string | null)) | string | null)) => void
    setOverlaysToDelete?: (value: (((prevState: string[]) => string[]) | string[])) => void
    shouldClearQueue: boolean
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
                   maxPage,
                   zoomLevel,
                   setOverlays,
                   setFormOverlays,
                   setActiveOverlayId,
                   setRenderedPages,
                   setOverlaysToDelete,
    shouldClearQueue
               }: PageProps) => {
    // Determine if the page is on the left side of the spread
    const isLeft = thisPage === 1 || thisPage % 2 === 0;
    const [canvasWidth, setCanvasWidth] = useState(0);
    const [canvasHeight, setCanvasHeight] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const [isInRenderQueue, setIsInRenderQueue] = useState(false);

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

    // Effect to track if the page is in the render queue
    useEffect(() => {
        // If the page should be rendered, it's in the render queue
        if (shouldRender) {
            setIsInRenderQueue(true);
        } else {
            // If the page shouldn't be rendered, it's not in the render queue
            setIsInRenderQueue(false);
        }
    }, [shouldRender]);

    // Create a ref to store the rendered pages set
    const renderedPagesRef = useRef<Set<number>>(new Set());

    // Effect to update isInRenderQueue when the page is rendered
    useEffect(() => {
        // Function to check if the page is rendered
        const checkIfRendered = () => {
            setRenderedPages(prevRenderedPages => {
                // Update the ref with the current rendered pages
                renderedPagesRef.current = prevRenderedPages;

                // If the page is in the rendered pages set, it's not in the render queue
                if (prevRenderedPages.has(thisPage)) {
                    setIsInRenderQueue(false);
                }

                return prevRenderedPages;
            });
        };

        // Check if the page is rendered
        checkIfRendered();

        // Create a timer to periodically check if the page is rendered
        const timer = setInterval(checkIfRendered, 500);

        // Clean up the timer when the component unmounts
        return () => clearInterval(timer);
    }, [thisPage, setRenderedPages]);


    useEffect(() => {
        if (currentPage === thisPage || (!isBelow1000px && (currentPage === thisPage + 1 && currentPage !== 2 && currentPage !== maxPage))) {
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
    }, [api, canvasWidth, currentPage, isBelow1000px, isLeft, maxPage, pageWidth, thisPage]);

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
                overlays={overlays}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                canvasScale={canvasScale}
                activeOverlayId={activeOverlayId}
                formOverlays={formOverlays}
                setOverlays={setOverlays}
                setFormOverlays={setFormOverlays}
                setActiveOverlayId={setActiveOverlayId}
                setOverlaysToDelete={setOverlaysToDelete}
                pdfCanvasRef={pdfCanvasRef}
                zoomLevel={zoomLevel}
            />

            {/* Loading Spinner */}
            {isInRenderQueue && (
                <div className="absolute min-w-20 inset-0 flex items-center justify-center bg-black bg-opacity-30 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                </div>
            )}
        </animated.div>
    );
});

export default Page;
