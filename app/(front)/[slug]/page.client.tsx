"use client"
import {ScreenSizeProvider} from "@/app/common/Flipbooks/hooks/useScreenSize";
import Flipbook from "@/app/common/Flipbooks/components/Flipbook";
import {Overlay} from "@/app/common/Flipbooks/types";
import {FlipBook} from "@/app/types";
import {useCallback, useState} from "react";
import flipbookContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/FlipbookContext";
import {runHeartbeat} from "@/app/common/Analytics/actions";
import {useHeartbeat} from "@/app/common/hooks/useHeartbeat";

const PageClient = ({data, overlays, pdfPath}:{data: FlipBook,overlays: Overlay[] | null, pdfPath:string}) => {
    const [currPage, setCurrPage] = useState(1);

    const heartbeatFn = useCallback(async () => {
        await runHeartbeat();
    }, []);

    useHeartbeat(heartbeatFn);

    return <ScreenSizeProvider>
        {data.pdf_path && <flipbookContext.Provider value={{setCurrPage: setCurrPage, currPage: currPage}}>
            <Flipbook flipbookId={data.id} pdfId={data.pdf_path} pdfPath={pdfPath}
                      initialOverlays={overlays}/>
        </flipbookContext.Provider>
        }            </ScreenSizeProvider>
}

export default PageClient;
