import {createContext} from "react";
import {Overlay} from "@/app/common/Flipbooks/types";

const editorContext = createContext<{
    mode: string,
    status: string,
    flipBookId: string,
    activeOverlayPageCanvas: HTMLCanvasElement | null,
    activeOverlay: Overlay | null,
    setActiveOverlay: (value: Overlay | null) => void,
    setActiveOverlayPageCanvas: (value: HTMLCanvasElement | null) => void,
}>({
    mode: "",
    status: "published",
    flipBookId: "",
    activeOverlayPageCanvas: null,
    setActiveOverlayPageCanvas: () => {},
    activeOverlay: null,
    setActiveOverlay: () => {}
});

export default editorContext;
