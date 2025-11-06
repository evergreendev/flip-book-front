"use client";
import { ScreenSizeProvider } from "@/app/common/Flipbooks/hooks/useScreenSize";
import Flipbook from "@/app/common/Flipbooks/components/Flipbook";
import { Overlay } from "@/app/common/Flipbooks/types";
import { FlipBook } from "@/app/types";
import { useCallback, useState } from "react";
import flipbookContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/FlipbookContext";
import {runHeartbeat, runReadSessionHeartbeat} from "@/app/common/Analytics/actions";
import { useHeartbeat } from "@/app/common/hooks/useHeartbeat";
import { useTabActivity } from "@/app/common/hooks/useTabActivity";

const PageClient = ({
                        data,
                        overlays,
                        pdfPath,
                    }: {
    data: FlipBook;
    overlays: Overlay[] | null;
    pdfPath: string;
}) => {
    const [currPage, setCurrPage] = useState(1);
    const { isActive } = useTabActivity();

    const heartbeatFn = useCallback(async () => {
        await runHeartbeat(isActive);
        await runReadSessionHeartbeat(isActive);
    }, [isActive]);
    useHeartbeat(heartbeatFn);

    return (
        <ScreenSizeProvider>
            {data.pdf_path && (
                <flipbookContext.Provider value={{ setCurrPage, currPage }}>
                    <Flipbook
                        flipbookId={data.id}
                        pdfId={data.pdf_path}
                        pdfPath={pdfPath}
                        initialOverlays={overlays}
                    />
                </flipbookContext.Provider>
            )}
        </ScreenSizeProvider>
    );
};

export default PageClient;
