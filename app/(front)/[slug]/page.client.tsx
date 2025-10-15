"use client";
import { ScreenSizeProvider } from "@/app/common/Flipbooks/hooks/useScreenSize";
import Flipbook from "@/app/common/Flipbooks/components/Flipbook";
import { Overlay } from "@/app/common/Flipbooks/types";
import { FlipBook } from "@/app/types";
import {useCallback, useRef, useState} from "react";
import flipbookContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/FlipbookContext";
import {runHeartbeat, runReadSessionHeartbeat} from "@/app/common/Analytics/actions";
import { useHeartbeat } from "@/app/common/hooks/useHeartbeat";
import { useTabActivity } from "@/app/common/hooks/useTabActivity";
import {AnalyticsProvider, useAnalytics} from "@/app/common/Analytics/AnalyticsProvider";
import {sendPageTimes} from "@/app/common/Analytics/analyticsTransport";
import {usePageTimer} from "@/app/common/hooks/usePageTimer";
import {useUnloadFlush} from "@/app/common/hooks/useUnloadFlush";

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

    const {userSession, readSession} = useAnalytics();

    const seqRef = useRef(0);
    const nextSeq = () => ++seqRef.current;

    // Commit handler: ship each entry immediately
    const onCommit = useCallback(({ page, time }: { page: number; time: number }) => {
        const payload = {
            sessionId: userSession ? userSession : "",
            readSession: readSession ? readSession : "",
            flipbookId: data.id,
            page,
            ms: time,
            seq: nextSeq(),
            ts_ms: Date.now(),
            idempotencyKey: `${readSession}:${seqRef.current}`,
        };
        sendPageTimes([payload]);
    }, [userSession, readSession, data.id]);

    const { onPageChange, flush } = usePageTimer({
        isActive,
        initialPage: currPage,
        onCommit: onCommit,
    });

    //  A) fire when the tab closes / app backgrounds
    useUnloadFlush(flush);

    const heartbeatFn = useCallback(async () => {
        await runHeartbeat(isActive);
        await runReadSessionHeartbeat(isActive);
    }, [isActive]);
    useHeartbeat(heartbeatFn);

    return (
        <ScreenSizeProvider>
            {data.pdf_path && (
                <flipbookContext.Provider value={{ setCurrPage, currPage }}>
                    <AnalyticsProvider>
                        <Flipbook
                            onPageChange={onPageChange}
                            flipbookId={data.id}
                            pdfId={data.pdf_path}
                            pdfPath={pdfPath}
                            initialOverlays={overlays}
                        />
                    </AnalyticsProvider>
                </flipbookContext.Provider>
            )}
        </ScreenSizeProvider>
    );
};

export default PageClient;
