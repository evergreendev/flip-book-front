import {createContext} from "react";

const ModeContext = createContext({mode:"", status:"published",flipBookId:"",activeTool:""});

export default ModeContext;
