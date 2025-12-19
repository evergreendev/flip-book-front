import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {useRouter} from 'next/navigation';
import editorContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/EditorContext";
import {v4 as uuidv4} from 'uuid';
import {Overlay} from "../../types";
import {Copy, Trash2, ClipboardPaste, ExternalLink} from "lucide-react";
import Notification from "@/app/common/components/Notification";
import {useScreenSize} from "@/app/common/Flipbooks/hooks/useScreenSize";
import {addClick, addImpression} from "@/app/common/Analytics/actions";

interface OverlayRendererProps {
    thisPage: number,
    currentPage: number,
    maxPage?: number | null,
    flipbookId: string,
    overlays: Overlay[][],
    formOverlays?: Overlay[] | null,
    setOverlays?: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void,
    setFormOverlays?: (value: Overlay[]) => void,
    setOverlaysToDelete?: (value: (((prevState: string[]) => string[]) | string[])) => void,
    pdfCanvasRef?: React.RefObject<HTMLCanvasElement | null>,
    canvasWidth: number,
    canvasHeight: number,
    canvasScale: number,
    zoomLevel: number
}

const OverlayRenderer: React.FC<OverlayRendererProps> = React.memo(({
                                                                        thisPage,
                                                                        currentPage,
                                                                        maxPage,
                                                                        overlays,
                                                                        formOverlays,
                                                                        setOverlays,
                                                                        flipbookId,
                                                                        setFormOverlays,
                                                                        pdfCanvasRef,
                                                                        setOverlaysToDelete,
                                                                        canvasWidth,
                                                                        canvasHeight,
                                                                        canvasScale
                                                                    }) => {
    const editorInfo = useContext(editorContext);
    const {isBelow1000px} = useScreenSize();
    const activeOverlayId = editorInfo?.activeOverlay?.id;
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const [draggingMode, setDraggingMode] = React.useState<"none" | "move" | "resize" | "create">("none");
    const [activeGrip, setActiveGrip] = React.useState<{ overlay: Overlay, grip: string | null } | null>(null);
    const [movingOverlay, setMovingOverlay] = React.useState<Overlay | null>(null);
    const [mouseDragInitialPosition, setMouseDragInitialPosition] = React.useState<[number, number] | null>(null);
    const [initialMouseOverlayMovePosition, setInitialMouseOverlayMovePosition] = React.useState<[number, number] | null>(null);
    const [mouseCreatePosition, setMouseCreatePosition] = React.useState<[number, number] | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [cursorStyle, setCursorStyle] = React.useState<string>("default");
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error';
        isVisible: boolean;
    }>({
        message: '',
        type: 'success',
        isVisible: false
    });
    // Controls visibility of overlays in view mode (non-edit)
    const [showOverlays, setShowOverlays] = useState(false);
    const router = useRouter();

    function isVisible(currentPage: number, thisPage: number, maxPage: number) {
        return currentPage === thisPage || (!isBelow1000px && (currentPage === thisPage + 1 && currentPage !== 2 && currentPage !== maxPage));
    }

    function findInsideOverlay(position: number[], overlays: Overlay[]) {
        if (!overlays || !maxPage) return;

        return overlays.find(overlay => {
            const left = overlay.x;
            const right = overlay.x + overlay.w;
            const bottom = overlay.y;
            const top = overlay.y + overlay.h;
            return position[0] > left
                && position[0] < right
                && position[1] > bottom
                && position[1] < top && isVisible(currentPage, overlay.page, maxPage);
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

    function findNearEdge(position: number[], overlay: Overlay, edgeThreshold: number = 16) {
        const left = overlay.x;
        const right = overlay.x + overlay.w;
        const bottom = overlay.y;
        const top = overlay.y + overlay.h;

        if (!maxPage) return null;

        if (!isVisible(currentPage, overlay.page, maxPage)) return null;

        // Check if near horizontal edges (for height-only resizing)
        if (position[0] > left + edgeThreshold && position[0] < right - edgeThreshold) {
            if (Math.abs(position[1] - bottom) <= edgeThreshold) {
                return "bottom"; // Near bottom edge
            }
            if (Math.abs(position[1] - top) <= edgeThreshold) {
                return "top"; // Near top edge
            }
        }

        // Check if near vertical edges (for width-only resizing)
        if (position[1] > bottom + edgeThreshold && position[1] < top - edgeThreshold) {
            if (Math.abs(position[0] - left) <= edgeThreshold) {
                return "left"; // Near left edge
            }
            if (Math.abs(position[0] - right) <= edgeThreshold) {
                return "right"; // Near right edge
            }
        }

        return null; // Not near any edge
    }

    function findInsideGrip(position: number[], overlays: Overlay[], gripSize: number = 8) {
        if (!overlays) return;

        let grip = "";

        const foundOverlay = overlays.find(overlay => {
            const topLeft = {x: overlay.x - gripSize / 2, y: overlay.y - gripSize / 2};
            const topRight = {x: overlay.x + overlay.w - gripSize / 2, y: overlay.y - gripSize / 2};
            const bottomLeft = {x: overlay.x - gripSize / 2, y: overlay.y + overlay.h - gripSize / 2};
            const bottomRight = {x: overlay.x + overlay.w - gripSize / 2, y: overlay.y + overlay.h - gripSize / 2};

            if (!maxPage) return null;

            if (!isVisible(currentPage, overlay.page, maxPage)) return null;

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
            // Corner grips - update both width and height
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

            // Edge grips - update only width or height
            case "left":
                return {
                    w: Math.max((overlay.w + (overlay.x - mouseX)), 0),
                    x: mouseX
                };
            case "right":
                return {
                    w: Math.max(mouseX - overlay.x, 0)
                };
            case "top":
                return {
                    h: Math.max(mouseY - overlay.y, 0)
                };
            case "bottom":
                return {
                    h: Math.max(overlay.h + (overlay.y - mouseY), 0),
                    y: mouseY
                };
            default:
                return {};
        }
    }

    // Function to ensure overlay stays within page boundaries
    function ensureOverlayWithinBounds(overlay: Overlay, canvasWidth: number, canvasHeight: number): Partial<Overlay> {
        const updates: Partial<Overlay> = {};
        if(canvasWidth === 0 || canvasHeight === 0) return updates;

        // Check x position (left edge)
        if (overlay.x < 0) {
            updates.x = 0;
        }

        // Check right edge
        if (overlay.x + overlay.w > canvasWidth / canvasScale) {
            // If width is larger than canvas, adjust width
            if (overlay.w > canvasWidth / canvasScale) {
                updates.w = canvasWidth / canvasScale;
                updates.x = 0;
            } else {
                // Otherwise adjust x position
                updates.x = (canvasWidth / canvasScale) - overlay.w;
            }
        }

        // Check y position (bottom edge)
        if (overlay.y < 0) {
            updates.y = 0;
        }

        // Check top edge
        if (overlay.y + overlay.h > canvasHeight / canvasScale) {
            // If height is larger than canvas, adjust height
            if (overlay.h > canvasHeight / canvasScale) {
                updates.h = canvasHeight / canvasScale;
                updates.y = 0;
            } else {
                // Otherwise adjust y position
                updates.y = (canvasHeight / canvasScale) - overlay.h;
            }
        }

        return updates;
    }

    const createOverlay = useCallback((mouseX: number, mouseY: number) => {
        if (!setOverlays || !mouseDragInitialPosition) return;

        const dragXDirection = mouseX > mouseDragInitialPosition[0] ? "right" : "left";
        const dragYDirection = mouseY > mouseDragInitialPosition[1] ? "up" : "down";

        const updatedOverlay: Overlay = {
            id: uuidv4(),
            flipbook_id: editorInfo.flipBookId,
            x: dragXDirection === "right" ? mouseDragInitialPosition[0] : mouseX,
            y: dragYDirection === "up" ? mouseDragInitialPosition[1] : mouseY,
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

        editorInfo.setActiveOverlay(updatedOverlay);
        setIsDeleting(false);
        editorInfo.setActiveOverlayPageCanvas(overlayRef.current);
        // Clear the copied overlay when creating a new one
        editorInfo.setCopiedOverlay(null);
        setActiveGrip({
            overlay: updatedOverlay,
            grip: getCornerDirection({x: mouseDragInitialPosition[0], y: mouseDragInitialPosition[1]}, {
                x: mouseX,
                y: mouseY
            })
        });

    }, [setOverlays, mouseDragInitialPosition, editorInfo, thisPage, setFormOverlays, formOverlays]);

    const renderOverlay = useCallback((canvas: HTMLCanvasElement, hideOverlays: boolean) => {
        const overlayContext = canvas.getContext('2d');
        const currOverlays = overlays[thisPage - 1];

        function convertToCanvasCoords([x, y, width, height]: [number, number, number, number]) {
            const scale = canvasScale;
            return [x * scale, canvas.height - ((y + height) * scale), width * scale, height * scale];
        }

        if (overlayContext && currOverlays?.length > 0) {
            overlayContext.clearRect(0, 0, canvas.width, canvas.height);

            overlayContext.globalAlpha = hideOverlays ? 0 : .5;

            currOverlays.forEach(overlay => {
                //console.log(overlay);
                if (activeOverlayId === overlay.id) {
                    overlayContext.fillStyle = "#338ccc";
                } else if (!overlay.url) {
                    overlayContext.fillStyle = "#808080"; // Gray color for overlays with no URL
                } else {
                    overlayContext.fillStyle = "#66cc33"; // Default green color
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

                    // Reset fill style based on the same conditions as before
                    if (activeOverlayId === overlay.id) {
                        overlayContext.fillStyle = "#338ccc";
                    } else if (!overlay.url) {
                        overlayContext.fillStyle = "#808080"; // Gray color for overlays with no URL
                    } else {
                        overlayContext.fillStyle = "#66cc33"; // Default green color
                    }
                    overlayContext.globalAlpha = hideOverlays ? 0 : .5;
                }
            })

            overlayContext.globalAlpha = 1;
        }
    }, [overlays, thisPage, canvasScale, activeOverlayId, editorInfo.mode]);

    const translateCoordinates = useCallback((e: MouseEvent) => {
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
    }, [canvasScale])

    function handleMouseExit(e: React.MouseEvent) {
        e.preventDefault();
        if (!overlayRef.current) return;
        setShowOverlays(false);
        renderOverlay(overlayRef.current, true);
        setCursorStyle("default");
    }

    function handleMouseDown(e: React.MouseEvent) {
        e.preventDefault();
        const [mouseX, mouseY] = translateCoordinates(e.nativeEvent);
        setMouseDragInitialPosition([mouseX, mouseY]);
    }

    useEffect(() => {
        function handleMouse(e: MouseEvent) {

            if (!overlayRef.current) return;
            const currOverlays = overlays ? overlays[thisPage - 1] : [];
            const position = translateCoordinates(e);

            const insideOverlay = findInsideOverlay(position, currOverlays);

            // In view mode, only show overlays when cursor intersects an overlay
            if (editorInfo.mode !== "edit") {
                setShowOverlays(!!insideOverlay);
                renderOverlay(overlayRef.current, !insideOverlay);
            } else {
                // In edit mode, always show overlays
                renderOverlay(overlayRef.current, false);
            }
            const insideGrip = findInsideGrip(position, currOverlays);

            // Set cursor style based on grip or edge position
            if (editorInfo.mode === "edit") {
                if (insideGrip) {
                    // Set cursor style based on which grip is being hovered
                    switch (insideGrip.grip) {
                        case "bottomLeft":
                        case "topRight":
                            setCursorStyle("nesw-resize");
                            break;
                        case "bottomRight":
                        case "topLeft":
                            setCursorStyle("nwse-resize");
                            break;
                        default:
                            setCursorStyle("default");
                    }
                } else if (insideOverlay) {
                    // Check if near an edge for width/height-only resizing
                    const nearEdge = findNearEdge(position, insideOverlay);
                    if (nearEdge) {
                        switch (nearEdge) {
                            case "left":
                            case "right":
                                setCursorStyle("ew-resize");
                                break;
                            case "top":
                            case "bottom":
                                setCursorStyle("ns-resize");
                                break;
                        }
                    } else if (draggingMode === "move") {
                        // Inside overlay and being dragged
                        setCursorStyle("move");
                    } else {
                        // Inside overlay but not being dragged
                        setCursorStyle("default");
                    }
                } else {
                    // Not inside any overlay or grip
                    setCursorStyle("default");
                }
            } else {
                // Not in edit mode
                setCursorStyle(insideOverlay ? "pointer" : "default");
            }

            if (e.type === "click") {
                if (e.target !== overlayRef.current) {
                    setMouseDragInitialPosition(null);
                    setDraggingMode("none");
                    setActiveGrip(null);
                    setMovingOverlay(null);
                    return;
                }

                if (insideOverlay) {
                    editorInfo.setActiveOverlay(insideOverlay);
                    setIsDeleting(false);
                    editorInfo.setActiveOverlayPageCanvas(overlayRef.current);
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
                    editorInfo.setActiveOverlay(null);
                    setIsDeleting(false);
                    editorInfo.setActiveOverlayPageCanvas(null);
                }
            }

            if (insideOverlay && editorInfo.mode !== "edit") {
                if (e.type === "click") {
                    addClick(flipbookId, thisPage, insideOverlay.id, insideOverlay.url);
                    router.push(insideOverlay.url);
                }
            }

            if (e.buttons !== 1) {
                setDraggingMode("none");
                setActiveGrip(null);
            }
            if (e.buttons === 1 && draggingMode === "none" && editorInfo.mode === "edit") {
                const [mouseX, mouseY] = translateCoordinates(e);

                if (!insideGrip && !insideOverlay && mouseDragInitialPosition && Math.hypot(mouseX - mouseDragInitialPosition[0], mouseY - mouseDragInitialPosition[1]) > 50) {
                    setDraggingMode("create");
                    setMouseCreatePosition([mouseX, mouseY]);
                    return;
                }


                if (insideGrip) {
                    setDraggingMode("resize");
                    setActiveGrip(insideGrip);
                    setMovingOverlay(null);
                } else if (insideOverlay) {
                    // Check if near an edge for width/height-only resizing
                    const nearEdge = findNearEdge(position, insideOverlay);
                    if (nearEdge) {
                        setDraggingMode("resize");
                        setActiveGrip({
                            overlay: insideOverlay,
                            grip: nearEdge
                        });
                        setMovingOverlay(null);
                    } else {
                        setDraggingMode("move");
                        setActiveGrip(null);
                        setMovingOverlay(insideOverlay);
                        setInitialMouseOverlayMovePosition([mouseX - insideOverlay.x, mouseY - insideOverlay.y]);
                    }
                }
            }

            if (draggingMode === "resize" && activeGrip && editorInfo.mode === "edit") {
                const [mouseX, mouseY] = translateCoordinates(e);
                const index = currOverlays.findIndex(o => o.id === activeGrip.overlay.id);
                if (index !== -1) {
                    const updatedDimensions = updateOverlayDimensions(activeGrip.grip!, activeGrip.overlay, mouseX, mouseY);
                    const updatedOverlay = {...currOverlays[index], ...updatedDimensions};

                    // Check if mouse is released (end of resize operation)
                    if (e.buttons !== 1) {
                        // Ensure overlay stays within bounds after resize is complete
                        const boundaryAdjustments = ensureOverlayWithinBounds(updatedOverlay, canvasWidth, canvasHeight);
                        Object.assign(updatedDimensions, boundaryAdjustments);
                        Object.assign(updatedOverlay, boundaryAdjustments);
                    }

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
                    if (index !== -1 && initialMouseOverlayMovePosition) {
                        const updatedOverlay = {...currOverlays[index]};
                        updatedOverlay.x = mouseX - initialMouseOverlayMovePosition[0];
                        updatedOverlay.y = mouseY - initialMouseOverlayMovePosition[1];

                        // Check if mouse is released (end of move operation)
                        if (e.buttons !== 1) {
                            // Ensure overlay stays within bounds after move is complete
                            const boundaryAdjustments = ensureOverlayWithinBounds(updatedOverlay, canvasWidth, canvasHeight);
                            Object.assign(updatedOverlay, boundaryAdjustments);
                        }

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
            }
        }

        const handleMouseUp = () => {
            setMouseDragInitialPosition(null);

            // When mouse is released, ensure all overlays are within bounds
            if (overlays && overlays[thisPage - 1] && setOverlays) {
                const currOverlays = overlays[thisPage - 1];
                let anyUpdated = false;

                const updatedOverlays = currOverlays.map(overlay => {
                    const boundaryAdjustments = ensureOverlayWithinBounds(overlay, canvasWidth, canvasHeight);
                    if (Object.keys(boundaryAdjustments).length > 0) {
                        anyUpdated = true;
                        return {...overlay, ...boundaryAdjustments};
                    }
                    return overlay;
                });

                if (anyUpdated) {
                    // Update overlays in state
                    const newOverlays = [...overlays];
                    newOverlays[thisPage - 1] = updatedOverlays;

                    setOverlays((prevOverlays) => {
                        if (!prevOverlays) return prevOverlays;

                        return prevOverlays.map(overlay => {
                            const matchingUpdated = updatedOverlays.find(updated => updated.id === overlay.id);
                            if (matchingUpdated) {
                                return matchingUpdated;
                            }
                            return overlay;
                        });
                    });

                    // Update form overlays if needed
                    if (setFormOverlays && formOverlays) {
                        setFormOverlays(formOverlays.map(overlay => {
                            const matchingUpdated = updatedOverlays.find(updated => updated.id === overlay.id);
                            if (matchingUpdated) {
                                return matchingUpdated;
                            }
                            return overlay;
                        }));
                    }
                }
            }
        };

        // Attach to window so it continues tracking outside the box
        window.addEventListener('mousemove', handleMouse);
        window.addEventListener('click', handleMouse);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouse);
            window.removeEventListener('click', handleMouse);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [activeGrip, createOverlay, draggingMode, editorInfo, formOverlays, initialMouseOverlayMovePosition, mouseDragInitialPosition, movingOverlay, overlays, renderOverlay, router, setFormOverlays, setOverlays, thisPage, translateCoordinates]);

    useEffect(() => {
        if (draggingMode === "create") {
            createOverlay(mouseCreatePosition![0], mouseCreatePosition![1]);
            setDraggingMode("resize");
        }
    }, [createOverlay, draggingMode, mouseCreatePosition, mouseDragInitialPosition]);

    // Effect to sync overlay canvas size with PDF canvas size
    useEffect(() => {
        if (!overlayRef.current || !pdfCanvasRef || !pdfCanvasRef.current) return;

        // Set the overlay canvas dimensions to match the PDF canvas
        overlayRef.current.width = canvasWidth;
        overlayRef.current.height = canvasHeight;

        // Re-render the overlay after resizing
        renderOverlay(overlayRef.current, editorInfo.mode !== "edit" && !showOverlays);
    }, [canvasHeight, canvasWidth, editorInfo.mode, pdfCanvasRef, renderOverlay, showOverlays]);

    //overlay render effect
    useEffect(() => {
        (async function () {
            if (!overlayRef.current) return;
            renderOverlay(overlayRef.current, editorInfo.mode !== "edit" && !showOverlays);
        })();
    }, [editorInfo.mode, renderOverlay, pdfCanvasRef, pdfCanvasRef?.current?.width, pdfCanvasRef?.current?.height, showOverlays]);

    const handleDeleteOverlay = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        if (!setOverlaysToDelete || !activeOverlayId) return;

        // Add the active overlay ID to the list of overlays to delete
        setOverlaysToDelete((overlays) => overlays.concat([activeOverlayId]));

        // Remove the overlay from formOverlays if it exists
        if (setFormOverlays && formOverlays) {
            setFormOverlays(formOverlays.filter(overlay => overlay.id !== activeOverlayId));
        }

        // Remove the overlay from overlays if it exists
        if (setOverlays) {
            setOverlays((overlays) => {
                if (!overlays) {
                    return overlays;
                }
                return overlays.filter(overlay => overlay.id !== activeOverlayId);
            });
        }

        // Clear the active overlay
        editorInfo.setActiveOverlay(null);
        setIsDeleting(false);
        editorInfo.setActiveOverlayPageCanvas(null);
    };

    const handleCopyOverlay = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!activeOverlayId) return;

        // Find the active overlay
        const activeOverlay = overlays[thisPage - 1]?.find(overlay => overlay.id === activeOverlayId);
        if (!activeOverlay) return;

        // Copy the overlay to the context
        editorInfo.setCopiedOverlay({...activeOverlay});

        // Show notification
        setNotification({
            message: 'Overlay Copied',
            type: 'success',
            isVisible: true
        });
    };

    const handlePasteOverlay = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!editorInfo.copiedOverlay || !setOverlays) return;

        // Create a new overlay based on the copied one
        const newOverlay: Overlay = {
            ...editorInfo.copiedOverlay,
            id: uuidv4(), // Generate a new ID
            page: thisPage // Set to current page
        };

        // Add the new overlay to the overlays state
        setOverlays((prevState) => {
            if (!prevState) return [newOverlay];
            return prevState.concat(newOverlay);
        });

        // Add to formOverlays if it exists
        if (setFormOverlays) {
            setFormOverlays(formOverlays ? [...formOverlays, newOverlay] : [newOverlay]);
        }
    };

    const handleOpenInNewTab = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!activeOverlayId) return;

        // Find the active overlay
        const activeOverlay = overlays[thisPage - 1]?.find(overlay => overlay.id === activeOverlayId);
        if (!activeOverlay || !activeOverlay.url) return;

        // Ensure URL has https: if needed
        let url = activeOverlay.url;
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        // Open in new tab
        window.open(url, '_blank');
    };

    // Find the active overlay to position the delete button
    const activeOverlay = overlays[thisPage - 1]?.find(overlay => overlay.id === activeOverlayId);

    const overlayCanvasBounding = overlayRef.current?.getBoundingClientRect();
    const overlayCanvasBottom = overlayCanvasBounding?.bottom || 0;
    const flipbookContainerBounding = editorInfo.flipbookContainer?.getBoundingClientRect();
    const flipbookContainerBottom = flipbookContainerBounding?.bottom || 0;
    const canvasBottom = flipbookContainerBottom - overlayCanvasBottom;

    // Briefly show overlays on page change in view mode
    useEffect(() => {
        if (editorInfo.mode === "edit") return;
        if (!overlayRef.current) return;
        // Show overlays immediately on page flip
        setShowOverlays(true);
        renderOverlay(overlayRef.current, false);
        const t = setTimeout(() => {
            setShowOverlays(false);
            if (overlayRef.current) renderOverlay(overlayRef.current, true);
        }, 500);
        return () => clearTimeout(t);
    }, [thisPage, editorInfo.mode, renderOverlay, currentPage]);


    useEffect(() => {
        if (editorInfo.mode === "edit") return;
        const isVisible = currentPage === thisPage || (!isBelow1000px && (currentPage === thisPage + 1 && currentPage !== 2 && currentPage !== maxPage));
        if (isVisible) {
            overlays[thisPage - 1]?.forEach((overlay) => addImpression(flipbookId, "overlay", thisPage - 1, overlay.id))
        }
    }, [thisPage, currentPage, isBelow1000px, maxPage, flipbookId, overlays, editorInfo.mode]);

    return (
        <>
            <Notification
                message={notification.message}
                type={notification.type}
                isVisible={notification.isVisible}
                onClose={() => setNotification(prev => ({...prev, isVisible: false}))}
            />
            <div
                className="absolute top-0 hidden">
                {/*{draggingMode} {mouseDragInitialPosition?.[0]} | {mouseDragInitialPosition?.[1]}*/}
                {activeOverlay?.h} | {activeOverlay?.y}
            </div>
            <canvas
                ref={overlayRef}
                className="absolute left-0 right-0 top-auto"
                style={{cursor: cursorStyle}}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseExit}
            />
            {activeOverlay && editorInfo.mode === "edit" && (
                <div
                    className="absolute z-10 flex"
                    style={{
                        bottom: ((activeOverlay.y) * canvasScale) + (canvasBottom / 2),
                        left: (activeOverlay.x + (activeOverlay.w / 2)) * canvasScale,
                        transform: `translate(-50%, 0)`
                    }}>
                    <button
                        onClick={handleCopyOverlay}
                        title="Copy overlay"
                        className="flex justify-center items-center size-8 bg-blue-500 hover:bg-blue-600 text-white p-1 transition-colors mr-1"
                    >
                        <Copy size={16}/>
                    </button>
                    <button
                        onClick={handleOpenInNewTab}
                        title="Open URL in new tab"
                        className="flex justify-center items-center size-8 bg-green-500 hover:bg-green-600 text-white p-1 transition-colors mr-1"
                    >
                        <ExternalLink size={16}/>
                    </button>
                    <button
                        onClick={handleDeleteOverlay}
                        title="Delete overlay"
                        className="flex justify-center items-center size-8 bg-red-500 hover:bg-red-600 text-white p-1 transition-colors"
                    >
                        <Trash2 size={16}/>
                    </button>
                    <button onClick={handleDeleteOverlay}
                            className={`${isDeleting ? "w-24" : "w-0 p-0"} duration-500 overflow-x-hidden bg-red-500 hover:bg-red-600 text-white transition-colors`}>
                        Confirm
                    </button>
                    <button onClick={(e) => {
                        e.preventDefault();
                        setIsDeleting(false);
                    }}
                            className={`${isDeleting ? "w-24 p-1" : "w-0 p-0"} duration-500 overflow-x-hidden bg-gray-200 hover:bg-gray-100 transition-all`}>
                        Cancel
                    </button>
                </div>
            )}

            {editorInfo.mode === "edit" && editorInfo.copiedOverlay && (
                <div
                    className="absolute z-10 bottom-4 right-4"
                >
                    <button
                        onClick={handlePasteOverlay}
                        title="Paste copied overlay to this page"
                        className="flex justify-center items-center gap-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded transition-colors"
                    >
                        <ClipboardPaste size={16}/>
                        <span>Paste Overlay</span>
                    </button>
                </div>
            )}
        </>
    );
});

OverlayRenderer.displayName = 'OverlayRenderer';

export default OverlayRenderer;
