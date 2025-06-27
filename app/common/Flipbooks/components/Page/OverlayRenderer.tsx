import React, {useCallback, useContext, useEffect, useRef} from "react";
import {useRouter} from 'next/navigation';
import editorContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/EditorContext";
import {v4 as uuidv4} from 'uuid';
import {Overlay} from "../../types";

interface OverlayRendererProps {
    thisPage: number,
    overlays: Overlay[][],
    activeOverlayId?: string | null,
    formOverlays?: Overlay[] | null,
    setOverlays?: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void,
    setFormOverlays?: (value: Overlay[]) => void,
    setActiveOverlayId?: (value: (((prevState: (string | null)) => (string | null)) | string | null)) => void,
    setOverlaysToDelete?: (value: (((prevState: string[]) => string[]) | string[])) => void,
    pdfCanvasRef?: React.RefObject<HTMLCanvasElement | null>,
    canvasWidth: number,
    canvasHeight: number,
    canvasScale: number,
    zoomLevel: number
}

const OverlayRenderer: React.FC<OverlayRendererProps> = ({
                                                             thisPage,
                                                             overlays,
                                                             activeOverlayId,
                                                             formOverlays,
                                                             setOverlays,
                                                             setFormOverlays,
                                                             setActiveOverlayId,
                                                             pdfCanvasRef,
                                                             canvasWidth,
                                                             canvasHeight,
                                                             canvasScale
                                                         }) => {
    const editorInfo = useContext(editorContext);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const [draggingMode, setDraggingMode] = React.useState<"none" | "move" | "resize" | "create">("none");
    const [activeGrip, setActiveGrip] = React.useState<{ overlay: Overlay, grip: string | null } | null>(null);
    const [movingOverlay, setMovingOverlay] = React.useState<Overlay | null>(null);
    const [mouseDragInitialPosition, setMouseDragInitialPosition] = React.useState<[number, number] | null>(null);
    const router = useRouter();

    const renderOverlay = useCallback((canvas: HTMLCanvasElement, hideOverlays: boolean) => {
        const overlayContext = canvas.getContext('2d');
        const currOverlays = overlays[thisPage - 1];

        function convertToCanvasCoords([x, y, width, height]: [number, number, number, number]) {
            const scale = canvasScale;
            return [x * scale, canvas.height - ((y + height) * scale), width * scale, height * scale];
        }

        if (overlayContext && currOverlays?.length > 0) {
            overlayContext.clearRect(0, 0, canvas.width, canvas.height);
            overlayContext.fillStyle = "#66cc33";

            overlayContext.globalAlpha = hideOverlays ? 0 : .5;

            currOverlays.forEach(overlay => {
                if (activeOverlayId === overlay.id) {
                    overlayContext.fillStyle = "#338ccc";
                }
                // @ts-expect-error silly tuple nonsense
                overlayContext.fillRect(...convertToCanvasCoords([overlay.x, overlay.y, overlay.w, overlay.h]))

                if (editorInfo.mode === "edit") {//render grips if in edit editorInfo
                    overlayContext.fillStyle = "#ccb333";
                    overlayContext.globalAlpha = 1;
                    const gripSize = 8;
                    // @ts-expect-error silly tuple nonsense
                    overlayContext.fillRect(...convertToCanvasCoords([overlay.x - gripSize / 2, overlay.y - gripSize / 2, gripSize, gripSize]))
                    // @ts-expect-error silly tuple nonsense
                    overlayContext.fillRect(...convertToCanvasCoords([overlay.x - ((gripSize / 2) - overlay.w), overlay.y - gripSize / 2, gripSize, gripSize]))
                    // @ts-expect-error silly tuple nonsense
                    overlayContext.fillRect(...convertToCanvasCoords([overlay.x - gripSize / 2, overlay.y - ((gripSize / 2) - overlay.h), gripSize, gripSize]))
                    // @ts-expect-error silly tuple nonsense
                    overlayContext.fillRect(...convertToCanvasCoords([overlay.x - ((gripSize / 2) - overlay.w), overlay.y - ((gripSize / 2) - overlay.h), gripSize, gripSize]))

                    overlayContext.fillStyle = "#66cc33";
                    overlayContext.globalAlpha = hideOverlays ? 0 : .5;
                }
            })

            overlayContext.globalAlpha = 1;
        }
    }, [overlays, thisPage, canvasScale, editorInfo.mode, activeOverlayId]);

    // Effect to sync overlay canvas size with PDF canvas size
    useEffect(() => {
        if (!overlayRef.current || !pdfCanvasRef || !pdfCanvasRef.current) return;

        // Set the overlay canvas dimensions to match the PDF canvas
        overlayRef.current.width = canvasWidth;
        overlayRef.current.height = canvasHeight;

        // Re-render the overlay after resizing
        renderOverlay(overlayRef.current, editorInfo.mode !== "edit");
    }, [canvasHeight, canvasWidth, editorInfo.mode, pdfCanvasRef, renderOverlay]);

    //overlay render effect
    useEffect(() => {
        (async function () {
            if (!overlayRef.current) return;
            renderOverlay(overlayRef.current, editorInfo.mode !== "edit");
        })();
    }, [editorInfo.mode, renderOverlay, pdfCanvasRef, pdfCanvasRef?.current?.width, pdfCanvasRef?.current?.height]);

    function findInsideOverlay(position: number[], overlays: Overlay[]) {
        if (!overlays) return;
        return overlays.find(overlay => {
            const left = overlay.x;
            const right = overlay.x + overlay.w;
            const bottom = overlay.y;
            const top = overlay.y + overlay.h;
            return position[0] > left && position[0] < right && position[1] > bottom && position[1] < top;
        })
    }

    function getCornerDirection(start: { x: number, y: number }, end: { x: number, y: number }) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;

        if (dx > 0 && dy < 0) return 'bottomRight';
        if (dx < 0 && dy < 0) return 'bottomLeft';
        if (dx > 0 && dy > 0) return 'topRight';
        if (dx < 0 && dy > 0) return 'topLeft';
        if (dx === 0 && dy === 0) return 'same';
        return 'undetermined';
    }

    function findInsideGrip(position: number[], overlays: Overlay[], gripSize: number = 8) {
        if (!overlays) return;
        let grip: string | null = null;

        const foundOverlay = overlays.find(overlay => {
            const topLeft = {x: overlay.x - gripSize / 2, y: overlay.y - gripSize / 2};
            const topRight = {x: overlay.x + overlay.w - gripSize / 2, y: overlay.y - gripSize / 2};
            const bottomLeft = {x: overlay.x - gripSize / 2, y: overlay.y + overlay.h - gripSize / 2};
            const bottomRight = {x: overlay.x + overlay.w - gripSize / 2, y: overlay.y + overlay.h - gripSize / 2};

            if ((position[0] >= topLeft.x && position[0] <= topLeft.x + gripSize &&
                position[1] >= topLeft.y && position[1] <= topLeft.y + gripSize)) {
                grip = "bottomLeft";
            }
            if ((position[0] >= topRight.x && position[0] <= topRight.x + gripSize &&
                position[1] >= topRight.y && position[1] <= topRight.y + gripSize)) {
                grip = "bottomRight";
            }
            if ((position[0] >= bottomLeft.x && position[0] <= bottomLeft.x + gripSize &&
                position[1] >= bottomLeft.y && position[1] <= bottomLeft.y + gripSize)) {
                grip = "topLeft";
            }
            if ((position[0] >= bottomRight.x && position[0] <= bottomRight.x + gripSize &&
                position[1] >= bottomRight.y && position[1] <= bottomRight.y + gripSize)) {
                grip = "topRight";
            }

            if (grip) return true;
        })

        if (!foundOverlay) return null;

        return {
            overlay: foundOverlay,
            grip: grip
        }
    }

    function updateOverlayDimensions(grip: string, overlay: Overlay, mouseX: number, mouseY: number): Partial<Overlay> {
        switch (grip) {
            case "bottomLeft":
                return {
                    w: Math.max((overlay.w + (overlay.x - mouseX)), 0),
                    x: mouseX,
                    h: Math.max(overlay.h + (overlay.y - mouseY), 0),
                    y: mouseY
                };
            case "bottomRight":
                return {
                    w: Math.max(mouseX - overlay.x, 0),
                    h: Math.max(overlay.h + (overlay.y - mouseY), 0),
                    y: mouseY
                };
            case "topLeft":
                return {
                    w: Math.max(overlay.w + (overlay.x - mouseX), 0),
                    h: Math.max(mouseY - overlay.y, 0),
                    x: mouseX
                };
            case "topRight":
                return {
                    w: Math.max(mouseX - overlay.x, 0),
                    h: Math.max(mouseY - overlay.y, 0),
                };
            default:
                return {};
        }
    }

    const createOverlay = useCallback((mouseX: number, mouseY: number) => {
        if (!setOverlays || !mouseDragInitialPosition) return;
        const updatedOverlay: Overlay = {
            id: uuidv4(),
            flipbook_id: editorInfo.flipBookId,
            x: mouseDragInitialPosition[0],
            y: mouseDragInitialPosition[1],
            w: mouseDragInitialPosition ? Math.abs(mouseX - mouseDragInitialPosition[0]) : 50,
            h: mouseDragInitialPosition ? Math.abs(mouseY - mouseDragInitialPosition[1]) : 50,
            url: "",
            page: thisPage
        };
        setOverlays((prevState) => {
            if (!prevState) return [updatedOverlay];
            return prevState.concat(updatedOverlay);
        });
        if (setFormOverlays) {
            setFormOverlays(formOverlays ? [...formOverlays, updatedOverlay] : [updatedOverlay]);
        }
        if (setActiveOverlayId) {
            console.log("setting active overlay id");
            setActiveOverlayId(updatedOverlay.id);
            setActiveGrip({overlay: updatedOverlay,
                grip: getCornerDirection({x: mouseDragInitialPosition[0], y: mouseDragInitialPosition[1]}, {
                    x: mouseX,
                    y: mouseY
                })
            });
        }
    }, [setOverlays, mouseDragInitialPosition, editorInfo.flipBookId, thisPage, setFormOverlays, setActiveOverlayId, formOverlays]);


    function translateCoordinates(e: React.MouseEvent) {
        const canvas = overlayRef.current;
        if (!canvas) return [0, 0];
        const transform = window.getComputedStyle(canvas).transform;
        const matrix = new DOMMatrixReadOnly(transform);
        const invertedMatrix = matrix.inverse();

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = rect.bottom - e.clientY;
        const canvasScaledHeight = canvas.height / canvasScale;
        const canvasScaledWidth = canvas.width / canvasScale;
        const widthAdjust = canvas.getBoundingClientRect().width / canvasScaledWidth;
        const heightAdjust = canvas.getBoundingClientRect().height / canvasScaledHeight;

        const transformedPoint = invertedMatrix.transformPoint({x: mouseX, y: mouseY});
        const adjustedX = transformedPoint.x / widthAdjust;
        const adjustedY = transformedPoint.y / heightAdjust;

        return [adjustedX, adjustedY];
    }

    function handleMouse(e: React.MouseEvent) {
        e.preventDefault();

        if (!overlayRef.current) return;
        renderOverlay(overlayRef.current, false);
        const currOverlays = overlays ? overlays[thisPage - 1] : [];

        const insideOverlay = findInsideOverlay(translateCoordinates(e), currOverlays);
        const insideGrip = findInsideGrip(translateCoordinates(e), currOverlays);

        if (insideOverlay && editorInfo.mode !== "edit") {
            if (e.type === "click") {
                router.push(insideOverlay.url);
            }
        }

        if (e.buttons !== 1) {
            setDraggingMode("none");
            setActiveGrip(null);
        }
        if (e.buttons === 1 && draggingMode === "none" && editorInfo.mode === "edit") {
            const [mouseX, mouseY] = translateCoordinates(e);

            if (mouseDragInitialPosition && Math.hypot(mouseX - mouseDragInitialPosition[0], mouseY - mouseDragInitialPosition[1]) > 50) {
                createOverlay(mouseX, mouseY);
                setDraggingMode("resize");
                return;
            }


            if (insideGrip) {
                setDraggingMode("resize");
                setActiveGrip(insideGrip);
                setMovingOverlay(null);
            } else if (insideOverlay) {
                setDraggingMode("move");
                setActiveGrip(null);
                setMovingOverlay(insideOverlay);
            }
        }

        if (draggingMode === "resize" && activeGrip && editorInfo.mode === "edit") {
            const [mouseX, mouseY] = translateCoordinates(e);
            const index = currOverlays.findIndex(o => o.id === activeGrip.overlay.id);
            if (index !== -1) {
                const updatedDimensions = updateOverlayDimensions(activeGrip.grip!, activeGrip.overlay, mouseX, mouseY);
                const updatedOverlay = {...currOverlays[index], ...updatedDimensions};
                const newOverlays = [...overlays];
                newOverlays[thisPage - 1] = [...currOverlays];
                newOverlays[thisPage - 1][index] = updatedOverlay;
                if (setOverlays) {
                    setOverlays((overlays) => {
                        if (!overlays) return overlays;
                        return overlays.map((overlay) => {
                            if (overlay.id === activeGrip.overlay.id) {
                                return {...overlay, ...updatedDimensions}
                            }
                            return overlay
                        })
                    });
                }

                if (!setFormOverlays) return;

                if (formOverlays) {
                    const existingOverlayToUpdate = formOverlays.find(overlay => overlay.id === activeGrip.overlay.id);
                    setFormOverlays(existingOverlayToUpdate ? formOverlays.map(overlay => {
                        if (overlay.id === activeGrip.overlay.id) {
                            return {...overlay, ...updatedDimensions}
                        }
                        return overlay
                    }) : formOverlays.concat([{...activeGrip.overlay, ...updatedDimensions}]));
                    return;
                }

                setFormOverlays([{...activeGrip.overlay, ...updatedDimensions}]);
            }
        } else {
            if (editorInfo.mode === "edit" && !insideGrip && draggingMode === "move" && movingOverlay) {
                const [mouseX, mouseY] = translateCoordinates(e);
                const index = currOverlays.findIndex(o => o.id === movingOverlay.id);
                if (index !== -1) {
                    const updatedOverlay = {...currOverlays[index]};
                    updatedOverlay.x = mouseX - (updatedOverlay.w / 2);
                    updatedOverlay.y = mouseY - (updatedOverlay.h / 2);
                    const newOverlays = [...overlays];
                    newOverlays[thisPage - 1] = [...currOverlays];
                    newOverlays[thisPage - 1][index] = updatedOverlay;
                    if (setOverlays) {
                        setOverlays((overlays) => {
                            if (!overlays) return overlays;

                            return overlays.map((overlay) => {
                                if (overlay.id === movingOverlay.id) {
                                    return {...overlay, x: updatedOverlay.x, y: updatedOverlay.y}
                                }
                                return overlay
                            })
                        });
                    }

                    if (!setFormOverlays) return;

                    if (formOverlays) {
                        const existingOverlayToUpdate = formOverlays.find(overlay => overlay.id === movingOverlay.id);
                        setFormOverlays(existingOverlayToUpdate ? formOverlays.map(overlay => {
                            if (overlay.id === movingOverlay.id) {
                                return {...overlay, x: updatedOverlay.x, y: updatedOverlay.y}
                            }
                            return overlay
                        }) : formOverlays.concat([{...movingOverlay, x: updatedOverlay.x, y: updatedOverlay.y}]))

                        return;
                    }

                    setFormOverlays([{...movingOverlay, x: updatedOverlay.x, y: updatedOverlay.y}]);
                }
            }

            if (setActiveOverlayId && e.type === "click") {
                if (insideOverlay) {
                    setActiveOverlayId(insideOverlay.id);
                    /*                        if (setOverlaysToDelete && activeOverlayId && activeOverlayId === insideOverlay.id) {
                                                setOverlaysToDelete((overlays) => overlays.concat([activeOverlayId]));
                                            }
                                            if (setFormOverlays && formOverlays && activeOverlayId === insideOverlay.id) {
                                                setFormOverlays(formOverlays.filter(overlay => overlay.id !== activeOverlayId));
                                            }
                                            if (setOverlays && activeOverlayId === insideOverlay.id) {
                                                setOverlays((overlays) => {
                                                    if (!overlays) {
                                                        return overlays
                                                    }
                                                    return overlays.filter(overlay => overlay.id !== activeOverlayId)
                                                })
                                            }*/

                } else {
                    setActiveOverlayId(null);
                }
            }
        }
    }

    function handleMouseExit(e: React.MouseEvent) {
        e.preventDefault();
        if (!overlayRef.current) return;
        renderOverlay(overlayRef.current, true);
    }

    function handleMouseDown(e: React.MouseEvent) {
        e.preventDefault();
        const [mouseX, mouseY] = translateCoordinates(e);
        setMouseDragInitialPosition([mouseX, mouseY]);
    }

    return (
        <>
            <div
                className="absolute top-0">{draggingMode} {mouseDragInitialPosition?.[0]} | {mouseDragInitialPosition?.[1]}</div>
            <canvas
                ref={overlayRef}
                className="absolute left-0 right-0 top-auto"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseExit}
                onClick={handleMouse}
                onMouseMove={handleMouse}
                onMouseUp={handleMouse}
            />
        </>

    );
};

export default OverlayRenderer;
