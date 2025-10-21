"use client"
import {ScreenSizeProvider} from "@/app/common/Flipbooks/hooks/useScreenSize";
import Flipbook from "@/app/common/Flipbooks/components/Flipbook";
import {Overlay} from "@/app/common/Flipbooks/types";
import {FlipBook} from "@/app/types";
import {useState} from "react";
import flipbookContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/FlipbookContext";

const PageClient = ({data, overlays, pdfPath}:{data: FlipBook,overlays: Overlay[] | null, pdfPath:string}) => {
    const [currPage, setCurrPage] = useState(1);

    return <ScreenSizeProvider>
        {data.pdf_path && <flipbookContext.Provider value={{setCurrPage: setCurrPage, currPage: currPage}}>
            <Flipbook flipbookId={data.id} pdfId={data.pdf_path} pdfPath={pdfPath}
                      initialOverlays={overlays}/>
        </flipbookContext.Provider>
        }            </ScreenSizeProvider>
}

export default PageClient;
