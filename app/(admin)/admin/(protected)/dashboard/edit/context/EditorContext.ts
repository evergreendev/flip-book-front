import {createContext} from "react";
import {Overlay} from "@/app/common/Flipbooks/types";

const editorContext = createContext<{
    mode: string,
    status: string,
    flipBookId: string,
    activeOverlay: Overlay | null,
    setActiveOverlay: (value: Overlay | null) => void,
}>({
    mode: "",
    status: "published",
    flipBookId: "",
    activeOverlay: null,
    setActiveOverlay: () => {}
});

export default editorContext;
