// useUnloadFlush.ts
"use client";
import { useEffect, useRef } from "react";

export function useUnloadFlush(flush: () => void | Promise<void>) {
    const flushRef = useRef(flush);
    // Always call the latest flush, but don't rebind listeners
    useEffect(() => { flushRef.current = flush; }, [flush]);

    useEffect(() => {
        let last = 0;
        const MIN_INTERVAL_MS = 1500; // throttle duplicate firings

        const doFlush = () => {
            const now = Date.now();
            if (now - last < MIN_INTERVAL_MS) return;
            last = now;
            try {
                void flushRef.current?.();
            } catch {
                // swallow; we're in unload scenarios
            }
        };

        const onPageHide = () => { doFlush(); };
        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") doFlush();
        };

        window.addEventListener("pagehide", onPageHide);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            window.removeEventListener("pagehide", onPageHide);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []); // listeners bound once
}
