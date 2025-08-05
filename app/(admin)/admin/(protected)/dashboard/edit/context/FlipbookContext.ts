import {createContext, Dispatch, SetStateAction} from "react";

const flipbookContext = createContext<{
    currPage: number,
    setCurrPage: Dispatch<SetStateAction<number>>,
}>({
    currPage: 0,
    setCurrPage: () => {}
});

export default flipbookContext;
