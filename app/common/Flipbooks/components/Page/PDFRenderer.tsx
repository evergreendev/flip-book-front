"use client"
import React, {useEffect, useRef} from "react";
import {useScreenSize} from "@/app/common/Flipbooks/hooks/useScreenSize";
import {PDFDocumentProxy} from "pdfjs-dist";

interface PDFRendererProps {
    currPage: number,
    pdfUrl: string,
    flipbookWidth: number,
    flipbookHeight: number,
    pagePosition: "left" | "right" | "center",
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    shouldRender?: boolean,
    zoomLevel: number,
    setCanvasHeight: (value: (((prevState: number) => number) | number)) => void,
    setCanvasWidth: (value: (((prevState: number) => number) | number)) => void,
    setCanvasScale: (value: (((prevState: number) => number) | number)) => void,
    setRenderedPages: React.Dispatch<React.SetStateAction<Set<number>>>,
    shouldClearQueue: boolean,
    renderedPageUrl: string
}

const getSizedCanvasDims = (flipbookWidth: number, flipbookHeight: number, isBelow1000px: boolean) => {
    // Use the available space (half of flipbook width) for placeholder
    const availableWidth = isBelow1000px ? flipbookWidth : flipbookWidth / 2;
    const availableHeight = flipbookHeight;

    // Use a standard aspect ratio if dimensions aren't available yet
    const aspectRatio = 0.75; // Standard PDF aspect ratio (portrait)

    // Determine dimensions based on available space
    let placeholderWidth, placeholderHeight;
    if (availableWidth / aspectRatio <= availableHeight) {
        placeholderWidth = availableWidth;
        placeholderHeight = availableWidth / aspectRatio;
    } else {
        placeholderHeight = availableHeight;
        placeholderWidth = availableHeight * aspectRatio;
    }

    return {placeholderWidth, placeholderHeight};
}

const PDFRenderer = React.memo(({
                         currPage,
                         shouldRender,
                         canvasRef,
                         flipbookWidth,
                         flipbookHeight,
                         pdfUrl,
                         pagePosition,
                         setCanvasHeight,
                         setCanvasWidth,
                         setCanvasScale,
                         setRenderedPages,
                         shouldClearQueue,
                         renderedPageUrl
                     }: PDFRendererProps) => {
    // Use a ref to track the current image loading operation
    const imageLoadingRef = useRef<{ cancel: () => void } | null>(null);
    const pdfRef = useRef<PDFDocumentProxy>(null);

    const {isBelow1000px} = useScreenSize();

    useEffect(() => {
        const isCancelled = false;
        let pdf: PDFDocumentProxy;

        const canvas = canvasRef.current;

        if (!shouldRender) return () => {
            // Cancel any ongoing image loading
            if (imageLoadingRef.current) {
                imageLoadingRef.current.cancel();
                imageLoadingRef.current = null;
            }

            const ctx = canvas?.getContext("2d", {
                alpha: false,
                preserveDrawingBuffer: true
            }) as CanvasRenderingContext2D;

            if (!canvas || !ctx) return;

            const sizedCanvasDims = getSizedCanvasDims(flipbookWidth, flipbookHeight, isBelow1000px);
            const placeholderHeight = sizedCanvasDims.placeholderHeight;
            const placeholderWidth = sizedCanvasDims.placeholderWidth;

            canvas.height = placeholderHeight || 1024;
            canvas.width = placeholderWidth || 768;

            ctx.fillStyle = "rgba(230,255,226,0.31)";

            // Calculate the position based on page position
            let x = 0;
            if (pagePosition === "left") {
                // For left pages, align right
                x = 0;
            } else if (pagePosition === "right") {
                // For right pages, align left
                x = 0;
            } else if (pagePosition === "center") {
                // For center pages, center it
                x = (canvas.width - placeholderWidth) / 2;
            }

            // Draw the placeholder at the calculated position
            ctx.fillRect(x, 0, placeholderWidth, placeholderHeight);
            ctx.fillStyle = "#f2fbe9";
        }

        async function renderPage(canvas: HTMLCanvasElement) {
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
                // Detect Safari browser
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

                // Prepare the canvas with calculated dimensions
                const canvasContext = canvas?.getContext("2d", {
                    alpha: false,
                    preserveDrawingBuffer: true,
                    willReadFrequently: isSafari // Improves rendering performance on Safari
                }) as CanvasRenderingContext2D;

                // Create a new image element to load the PNG
                const img = new Image();

                // Set up a promise to handle image loading with cancellation capability
                let imageLoadReject: (reason?: unknown) => void;

                const imageLoadPromise = new Promise<void>((resolve, reject) => {
                    imageLoadReject = reject;

                    img.onload = () => resolve();
                    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
                });

                // Create a cancellable operation
                imageLoadingRef.current = {
                    cancel: () => {
                        // Prevent the image from continuing to load
                        img.src = '';
                        imageLoadReject(new Error('Image loading cancelled'));
                    }
                };

                // Start loading the image
                img.src = renderedPageUrl;

                // Wait for the image to load
                await imageLoadPromise;

                // If cancelled during loading, exit early
                if (isCancelled) return;

                // Calculate the available space (half of flipbook width)
                const availableWidth = isBelow1000px ? flipbookWidth : flipbookWidth / 2;
                const availableHeight = flipbookHeight;

                // Calculate image aspect ratio
                const imageAspectRatio = img.width / img.height;

                let scale: number;
                let displayWidth, displayHeight;
                const originalViewport = page.getViewport({scale: 1});

                if (availableWidth / imageAspectRatio <= availableHeight) {
                    // Width is the constraint
                    displayWidth = availableWidth;
                    displayHeight = availableWidth / imageAspectRatio;
                    scale = (availableWidth / originalViewport.width);
                } else {
                    // Height is the constraint
                    displayHeight = availableHeight;
                    displayWidth = availableHeight * imageAspectRatio;
                    scale = (availableHeight / originalViewport.height);
                }

                // Clear any previous content with transparent background
                canvasContext.clearRect(0, 0, displayWidth, displayHeight);
                const dpr = window.devicePixelRatio || 1;

                canvas.height = displayHeight * dpr;
                canvas.width = displayWidth * dpr;

                // Set the display size to maintain visual dimensions
                canvas.style.width = `${displayWidth}px`;
                canvas.style.height = `${displayHeight}px`;

                setCanvasWidth(displayWidth);
                setCanvasHeight(displayHeight);
                setCanvasScale(scale);

                // For Safari, we need to ensure proper transparency handling
                if (isSafari) {
                    // Set global composite operation to ensure transparency works correctly
                    canvasContext.globalCompositeOperation = 'source-over';
                }

                canvasContext.scale(dpr, dpr);

                canvasContext.clearRect(0, 0, displayWidth, displayHeight);

                canvasContext.imageSmoothingQuality = 'high';



                canvasContext.drawImage(img, 0, 0, displayWidth, displayHeight);

                canvasContext.setTransform(1, 0, 0, 1, 0, 0);

                setCanvasWidth(displayWidth);
                setCanvasHeight(displayHeight);
                setCanvasScale(scale);

                // Mark this page as rendered
                setRenderedPages(prevState => {
                    const newSet = new Set(prevState);
                    newSet.add(currPage);
                    return newSet;
                });

                /*console.log('Image rendering succeeded');*/
            } catch (e) {
                console.log(e);
            } finally {
                // Clear the image loading reference
                imageLoadingRef.current = null;
            }
        }

        (async function () {
            if (!canvasRef.current) return;
            await renderPage(canvasRef.current);
        })();

        // Cleanup function to cancel the image loading if the component unmounts.
        return () => {
            if (imageLoadingRef.current) {
                imageLoadingRef.current.cancel();
                imageLoadingRef.current = null;
            }
            if (pdfRef.current) {
                pdfRef.current.destroy().then(() => {
                    /*console.log("destroyed")*/
                });
            }
        };
    }, [canvasRef, currPage, renderedPageUrl, shouldRender, flipbookWidth, flipbookHeight, pagePosition, setCanvasWidth, setCanvasHeight, setCanvasScale, setRenderedPages, isBelow1000px, pdfUrl]);

    useEffect(() => {
        if (shouldClearQueue) {
            /*console.log("Image loading cancelled by renderQueue");*/
            if (imageLoadingRef.current) {
                imageLoadingRef.current.cancel();
                imageLoadingRef.current = null;
            }
        }
    }, [shouldClearQueue]);

    let positionClasses = "";

    switch (pagePosition) {
        case "left":
            positionClasses = "ml-auto";
            break;
        case "right":
            positionClasses = "mr-auto";
            break;
        case "center":
            positionClasses = "mx-auto";
            break;
    }

    return <canvas className={positionClasses} ref={canvasRef}/>;
});

PDFRenderer.displayName = "PDFRenderer";

export default PDFRenderer;
