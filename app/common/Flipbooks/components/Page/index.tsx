import {Overlay} from "@/app/common/Flipbooks/types";
import {animated, useSpring} from "@react-spring/web";
import React, {memo, useContext, useEffect, useLayoutEffect, useRef, useState} from "react";
import PDFRenderer from "@/app/common/Flipbooks/components/Page/PDFRenderer";
import OverlayRenderer from "@/app/common/Flipbooks/components/Page/OverlayRenderer";
import {useScreenSize} from "@/app/common/Flipbooks/hooks/useScreenSize";
import {addImpression} from "@/app/common/Analytics/actions";
import editorContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/EditorContext";
import {PDFDocumentProxy} from "pdfjs-dist";
import {PAGE_TURN_DURATION, pageTurn, visiblePages} from "../../pageTurn";

// React Spring 9's intrinsic element types omit DOM props with React 19.
const AnimatedDiv = animated.div as React.ComponentType<
    Omit<React.HTMLAttributes<HTMLDivElement>, "style"> &
    React.ComponentProps<typeof animated.div> & {ref?: React.Ref<HTMLDivElement>}
>;

interface PageProps {
    thisPage: number
    onPageWidth?: (width: number) => void
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
    loadPdf: (pdfUrl: string) => Promise<PDFDocumentProxy>
}

const Page = memo(({
                   thisPage,
                   onPageWidth,
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
    loadPdf
               }: PageProps) => {
    // Determine if the page is on the left side of the spread
    const isLeft = thisPage % 2 === 0;
    const [canvasWidth, setCanvasWidth] = useState(0);
    const [canvasHeight, setCanvasHeight] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const editorInfo = useContext(editorContext);

    // Determine page position based on page number
    const pagePosition = isLeft ? "left" : "right";

    const {isBelow1000px} = useScreenSize();
    const previousPage = useRef(currentPage);
    const previousLayout = useRef(isBelow1000px);
    const [isTurning, setIsTurning] = useState(false);
    const [isPresent, setIsPresent] = useState(false);
    const [springs, api] = useSpring(() => ({rotation: 0}));
    const isVisible = visiblePages(currentPage, maxPage || 0, isBelow1000px).includes(thisPage);

    useLayoutEffect(() => {
        const turn = pageTurn(thisPage, previousPage.current, currentPage, maxPage || 0, isBelow1000px);
        const changed = previousPage.current !== currentPage;
        const animate = changed && previousLayout.current === isBelow1000px &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        previousPage.current = currentPage;
        previousLayout.current = isBelow1000px;
        api.stop();
        setIsPresent(turn.isVisible || (animate && turn.wasVisible));
        setIsTurning(animate && turn.moving);
        if (!animate) {
            api.set({rotation: 0});
            return;
        }
        api.start({
            from: {rotation: turn.from},
            to: {rotation: turn.to},
            reset: true,
            config: {duration: PAGE_TURN_DURATION, easing: t => t * t * (3 - 2 * t)},
        });
        const timer = window.setTimeout(() => {
            setIsPresent(turn.isVisible);
            setIsTurning(false);
        }, PAGE_TURN_DURATION);
        return () => {
            window.clearTimeout(timer);
            api.stop();
        };
    }, [api, currentPage, isBelow1000px, maxPage, thisPage]);

    useEffect(() => {
        if (isVisible && editorInfo.mode !== "edit") {
            addImpression(flipbookId, "page", thisPage - 1);
        }
    }, [isVisible, editorInfo.mode, flipbookId, thisPage]);

    useEffect(() => {
        if (thisPage === 1 && canvasWidth > 0) onPageWidth?.(canvasWidth);
    }, [canvasWidth, onPageWidth, thisPage]);

    const pageRef = useRef<HTMLDivElement>(null);
    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

    return (
        <AnimatedDiv
            ref={pageRef}
            data-flipbook-page={thisPage}
            aria-hidden={!isVisible}
            inert={!isVisible || isTurning}
            className="absolute flex flex-col justify-center items-center"
            style={{
                top: "50%",
                left: isBelow1000px ? "50%" : (isLeft ? undefined : "50%"),
                right: !isBelow1000px && isLeft ? "50%" : undefined,
                width: canvasWidth,
                height: canvasHeight,
                visibility: isPresent || isVisible ? "visible" : "hidden",
                pointerEvents: isVisible && !isTurning ? "auto" : "none",
                transformOrigin: !isBelow1000px && isLeft ? "right center" : "left center",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                zIndex: isTurning ? 4 : isVisible ? 1 : 2,
                transform: springs.rotation.to(rotation =>
                    `translate(${isBelow1000px ? '-50%' : '0'}, -50%) rotateY(${rotation}deg)`),
                willChange: isTurning ? "transform" : undefined,
                background: "#fff",
                boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
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
                loadPdf={loadPdf}
            />
            <AnimatedDiv
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                    zIndex: 2,
                    opacity: springs.rotation.to(rotation => Math.sin(Math.abs(rotation) * Math.PI / 180) * 0.45),
                    background: `linear-gradient(${isLeft ? '270deg' : '90deg'}, rgba(0,0,0,0.65), rgba(0,0,0,0.05) 45%, rgba(255,255,255,0.4))`,
                }}
            />
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
                 style={{background: `linear-gradient(${isLeft ? '270deg' : '90deg'}, rgba(0,0,0,0.12), transparent 5%)`}} />
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
        </AnimatedDiv>
    );
});

Page.displayName = "Page";

export default Page;
