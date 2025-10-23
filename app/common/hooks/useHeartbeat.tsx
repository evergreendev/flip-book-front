import { useEffect, useRef } from "react";

export function useHeartbeat(fn: () => Promise<void>, ms = 30_000) {
    const runningRef = useRef(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        let mounted = true;

        const tick = async () => {
            if (!mounted || runningRef.current) return;
            runningRef.current = true;

            try {
                await fn();
                 // or await fn(abortRef.current.signal)
            } catch (err) {
                // handle/log; swallow so the interval keeps going
                console.error(err);
            } finally {
                runningRef.current = false;
            }
        };

        // start interval (every ms)
        const id = setInterval(tick, ms);

        return () => {
            mounted = false;
            abortRef.current?.abort();
            clearInterval(id);
        };
    }, [fn, ms]);
}
