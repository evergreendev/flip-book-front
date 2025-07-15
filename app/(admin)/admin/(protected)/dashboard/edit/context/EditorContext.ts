import {createContext} from "react";
import {Overlay} from "@/app/common/Flipbooks/types";

const editorContext = createContext<{
    mode: string,
    status: string,
    flipBookId: string,
    activeOverlayPageCanvas: HTMLCanvasElement | null,
    activeOverlay: Overlay | null,
    copiedOverlay: Overlay | null,
    flipbookContainer: HTMLDivElement | null,
    setActiveOverlay: (value: Overlay | null) => void,
    setCopiedOverlay: (value: Overlay | null) => void,
    setActiveOverlayPageCanvas: (value: HTMLCanvasElement | null) => void,
    setFlipbookContainer: (value: HTMLDivElement | null) => void,
}>({
    mode: "",
    status: "published",
    flipBookId: "",
    activeOverlayPageCanvas: null,
    setActiveOverlayPageCanvas: () => {},
    activeOverlay: null,
    copiedOverlay: null,
    setActiveOverlay: () => {},
    setCopiedOverlay: () => {},
    flipbookContainer: null,
    setFlipbookContainer: () => {}
});

export default editorContext;
