"use client"
import React, {useEffect, useRef} from "react";
import {PDFDocumentProxy, RenderTask} from "pdfjs-dist";
import {RenderParameters} from "pdfjs-dist/types/src/display/api";

interface PDFRendererProps {
    currPage: number,
    pdfUrl: string,
    shouldRender?: boolean,
}

const PDFRenderer = ({currPage, pdfUrl, shouldRender}: PDFRendererProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pdfRef = useRef<PDFDocumentProxy>(null);
    const renderTaskRef = useRef<RenderTask>(null);

    useEffect(() => {
        const isCancelled = false;
        let pdf: PDFDocumentProxy;

        const canvas = canvasRef.current;

        if (!shouldRender) return async () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
            const ctx = canvas?.getContext("2d");

            if (!canvas || !ctx) return;

            canvas.height = 1024;
            canvas.width = 768;

            ctx.fillStyle = "#58ca70";
            ctx.fillRect(0, 0, canvas.width, canvas.height);//todo add loading
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
                const viewport = page.getViewport({scale: 1.5});

                // Prepare the canvas.
                const canvasContext = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Ensure no other render tasks are running.
                if (renderTaskRef.current) {
                    await renderTaskRef.current.promise;
                }

                // Render the page into the canvas.
                const renderContext = {canvasContext, viewport};
                const renderTask = page.render(renderContext as RenderParameters);

                // Store the render task.
                renderTaskRef.current = renderTask;

                // Wait for rendering to finish.
                try {
                    await renderTask.promise;
                } catch (error) {
                    // @ts-expect-error Don't need to know the error type
                    if (error.name === 'RenderingCancelledException') {
                        console.log('Rendering cancelled.');
                    } else {
                        console.error('Render error:', error);
                    }
                }

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
    }, [currPage, pdfRef, pdfUrl, renderTaskRef, shouldRender]);


    return <canvas ref={canvasRef}/>
}

export default PDFRenderer;
