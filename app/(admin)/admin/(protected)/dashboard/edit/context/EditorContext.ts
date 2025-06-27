import {createContext} from "react";

const editorContext = createContext<{
    mode: string,
    status: string,
    flipBookId: string,
    activeOverlay: {
        position: {x: number, y: number},
        size: {width: number, height: number},
        id: string | null
    }
}>({
    mode: "",
    status: "published",
    flipBookId: "",
    activeOverlay: {
        position: {x: 0, y: 0},
        size: {width: 0, height: 0},
        id: null
    }
});

export default editorContext;
