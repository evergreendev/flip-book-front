"use client"
import React, {useEffect, useRef} from "react";
import {useScreenSize} from "@/app/common/Flipbooks/hooks/useScreenSize";

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

const PDFRenderer = ({
                         currPage,
                         shouldRender,
                         canvasRef,
                         flipbookWidth,
                         flipbookHeight,
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

    const {isBelow1000px} = useScreenSize();

    useEffect(() => {
        const isCancelled = false;

        const canvas = canvasRef.current;

        if (!shouldRender) return () => {
            // Cancel any ongoing image loading
            if (imageLoadingRef.current) {
                imageLoadingRef.current.cancel();
                imageLoadingRef.current = null;
            }

            const ctx = canvas?.getContext("2d", {
                alpha: true,
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
            ctx.fillRect(x, 0, placeholderWidth, placeholderHeight); // todo add loading
            ctx.fillStyle = "#f2fbe9";
        }

        async function renderPage(canvas: HTMLCanvasElement) {
            try {
                // Detect Safari browser
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

                // Prepare the canvas with calculated dimensions
                const canvasContext = canvas?.getContext("2d", {
                    alpha: true,
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

                // Apply a resolution multiplier for small screens
                const resolutionMultiplier = isBelow1000px ? 5.0 : 1.0;

                // Calculate the canvas dimensions to fit inside the flipbook
                let canvasWidth, canvasHeight;
                let scale: number;
                let displayWidth, displayHeight;

                if (availableWidth / imageAspectRatio <= availableHeight) {
                    // Width is the constraint
                    scale = availableWidth / img.width;
                    displayWidth = availableWidth;
                    displayHeight = availableWidth / imageAspectRatio;
                } else {
                    // Height is the constraint
                    displayHeight = availableHeight;
                    displayWidth = availableHeight * imageAspectRatio;
                    scale = availableHeight / img.height;
                }

                // For screens below 1000px, increase canvas pixel density for better quality
                if (isBelow1000px) {
                    // Increase canvas dimensions for higher pixel density
                    canvasWidth = displayWidth * resolutionMultiplier;
                    canvasHeight = displayHeight * resolutionMultiplier;
                } else {
                    canvasWidth = displayWidth;
                    canvasHeight = displayHeight;
                }

                // Clear any previous content with transparent background
                canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);

                canvas.height = canvasHeight;
                canvas.width = canvasWidth;

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

                // Draw the image on the canvas, scaled to fit
                if (isBelow1000px) {
                    // Apply the resolution multiplier for better quality on small screens
                    canvasContext.scale(resolutionMultiplier, resolutionMultiplier);
                }

                canvasContext.drawImage(img, 0, 0, displayWidth, displayHeight);

                // Reset the scale if it was modified
                if (isBelow1000px) {
                    canvasContext.setTransform(1, 0, 0, 1, 0, 0);
                }

                // Mark this page as rendered
                setRenderedPages(prevState => {
                    const newSet = new Set(prevState);
                    newSet.add(currPage);
                    return newSet;
                });

                console.log('Image rendering succeeded');
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
        };
    }, [canvasRef, currPage, renderedPageUrl, shouldRender, flipbookWidth, flipbookHeight, pagePosition, setCanvasWidth, setCanvasHeight, setCanvasScale, setRenderedPages, isBelow1000px]);

    useEffect(() => {
        if (shouldClearQueue) {
            console.log("Image loading cancelled by renderQueue");
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
}

export default PDFRenderer;
