"use client"
import React, {useEffect, useRef} from "react";
import {PDFDocumentProxy, RenderTask} from "pdfjs-dist";
import {RenderParameters} from "pdfjs-dist/types/src/display/api";

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
}

const getSizedCanvasDims = (flipbookWidth: number, flipbookHeight: number) => {
    // Use the available space (half of flipbook width) for placeholder
    const availableWidth = flipbookWidth / 2;
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
                         pdfUrl,
                         shouldRender,
                         canvasRef,
                         flipbookWidth,
                         flipbookHeight,
                         pagePosition,
                         setCanvasHeight,
                         setCanvasWidth,
                         setCanvasScale,
                         zoomLevel
                     }: PDFRendererProps) => {
    const pdfRef = useRef<PDFDocumentProxy>(null);
    const renderTaskRef = useRef<RenderTask>(null);

    useEffect(() => {
        const isCancelled = false;
        let pdf: PDFDocumentProxy;
        const MAX_RENDER_RETRIES = 5;

        const canvas = canvasRef.current;

        if (!shouldRender) return async () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
            const ctx = canvas?.getContext("2d");

            if (!canvas || !ctx) return;

            const sizedCanvasDims = getSizedCanvasDims(flipbookWidth, flipbookHeight);
            const placeholderHeight = sizedCanvasDims.placeholderHeight;
            const placeholderWidth = sizedCanvasDims.placeholderWidth;

            canvas.height = placeholderHeight || 1024;
            canvas.width = placeholderWidth || 768;

            ctx.fillStyle = "#58ca70";

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
            ctx.fillStyle = "#75b543";
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

                // Get original viewport to calculate aspect ratio
                const originalViewport = page.getViewport({scale: 1.0});
                const pageAspectRatio = originalViewport.width / originalViewport.height;

                // Calculate the available space (half of flipbook width)
                const availableWidth = flipbookWidth / 2;
                const availableHeight = flipbookHeight;

                // Calculate the canvas dimensions to fit inside the flipbook
                let canvasWidth, canvasHeight;
                let scale: number;
                if (availableWidth / pageAspectRatio <= availableHeight) {
                    // Width is the constraint
                    scale = availableWidth / originalViewport.width;
                    canvasWidth = availableWidth;
                    canvasHeight = availableWidth / pageAspectRatio;
                } else {
                    // Height is the constraint
                    canvasHeight = availableHeight;
                    canvasWidth = availableHeight * pageAspectRatio;
                    scale = availableHeight / originalViewport.height;
                }

                // Create viewport with calculated scale
                const viewport = page.getViewport({scale: scale});

                // Prepare the canvas with calculated dimensions
                const canvasContext = canvas.getContext('2d');
                canvas.height = canvasHeight;
                canvas.width = canvasWidth;
                setCanvasWidth(canvas.width)
                setCanvasHeight(canvas.height)
                setCanvasScale(scale)

                // Ensure no other render tasks are running.
                if (renderTaskRef.current) {
                    await renderTaskRef.current.promise;
                }

                // Render the page into the canvas with the positioned viewport
                const renderContext = {canvasContext, viewport: viewport};
                const renderTask = page.render(renderContext as RenderParameters);

                // Store the render task.
                renderTaskRef.current = renderTask;

                // Wait for rendering to finish.
                // Function to attempt rendering with retries
                async function attemptRender(currentRetry = 0): Promise<void> {
                    if (currentRetry > 0) {
                        console.log(`Attempting render retry ${currentRetry}/${MAX_RENDER_RETRIES}`);
                    }

                    try {
                        // If this is a retry, create a new render task
                        if (currentRetry > 0) {
                            const newRenderTask = page.render(renderContext as RenderParameters);
                            renderTaskRef.current = newRenderTask;
                            await newRenderTask.promise;
                        } else {
                            // First attempt uses the original render task
                            await renderTask.promise;
                        }
                        // If we get here, rendering succeeded
                        console.log(currentRetry > 0 ? `Render retry ${currentRetry} succeeded` : 'Render succeeded');
                    } catch (error) {
                        // @ts-expect-error Don't need to know the error type
                        if (error.name === 'RenderingCancelledException') {
                            console.log(`Rendering cancelled at attempt ${currentRetry + 1}`);
                            // If we haven't exceeded max retries, try again
                            if (currentRetry < MAX_RENDER_RETRIES) {
                                return attemptRender(currentRetry + 1);
                            } else {
                                console.log(`Maximum retries (${MAX_RENDER_RETRIES}) exceeded. Giving up.`);
                            }
                        } else {
                            console.error('Render error:', error);
                        }
                    }
                }

                // Start the render process with retries
                await attemptRender();

                if (!isCancelled) {
                    await pdf.destroy();
                }
            } catch (e) {
                console.log(e)
            } finally {
                await pdf?.destroy();
            }
        }

        (async function () {
            if (!canvasRef.current) return;
            await renderPage(canvasRef.current);
        })();

        // Cleanup function to cancel the render task if the component unmounts.
        return () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
            if (pdfRef.current) {
                pdfRef.current.destroy().then(() => console.log("destroyed"));
            }
        };
    }, [canvasRef, currPage, pdfRef, pdfUrl, renderTaskRef, shouldRender, flipbookWidth, flipbookHeight, pagePosition, zoomLevel, setCanvasWidth, setCanvasHeight, setCanvasScale]);

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
