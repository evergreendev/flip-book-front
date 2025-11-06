import {useEffect, useRef, useState} from "react";

export type PageRead = { page: number; time: number };

type UsePageTimerOptions = {
    /** If false, time accumulation pauses */
    isActive: boolean;
    /** Ignore commits below this threshold (ms). Default: 50 */
    minCommitMs?: number;
    initialPage?: number;
    /** Optional callback for each page-time commit */
    onCommit?: (entry: PageRead) => void | Promise<void>;
    /** If true, store all commits in state for UI/debug (default: true) */
    keepHistory?: boolean;
};

export function usePageTimer({
                                 isActive,
                                 minCommitMs = 50,
                                 onCommit,
                                 initialPage = 1,
                                 keepHistory = true,
                             }: UsePageTimerOptions) {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [pageReadTime, setPageReadTime] = useState<PageRead[]>([]);

    const prevPageRef = useRef<number | null>(initialPage);
    const startTimeRef = useRef(performance.now());
    const accumulatedMsRef = useRef(0);

    // rAF loop: updates elapsedTime for display
    useEffect(() => {
        let rafId: number;

        const tick = () => {
            if (isActive) {
                const now = performance.now();
                const diff = now - startTimeRef.current;
                setElapsedTime(Math.round(accumulatedMsRef.current + diff));
            }
            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [isActive]);

    // Pause/resume accumulation
    useEffect(() => {
        const now = performance.now();

        if (isActive) {
            // resume
            startTimeRef.current = now;
        } else {
            // pause: record diff
            const diff = now - startTimeRef.current;
            accumulatedMsRef.current += diff;
        }
    }, [isActive]);

    const commit = async (page: number, ms: number) => {
        const entry = {page, time: Math.round(ms)};
        if (entry.time < minCommitMs) return;

        if (keepHistory) {
            setPageReadTime((prev) => [...prev, entry]);
        }
        if (onCommit) {
            await onCommit(entry);
        }
    };

    /** Call this whenever the page changes */
    const onPageChange = async (newPage: number) => {
        const now = performance.now();
        const diff = now - startTimeRef.current;
        const totalMs = accumulatedMsRef.current + diff;

        // commit previous page time first
        if (prevPageRef.current !== null) {
            await commit(prevPageRef.current, totalMs);
        }

        // reset for next page
        prevPageRef.current = newPage;
        accumulatedMsRef.current = 0;
        startTimeRef.current = performance.now();
        setElapsedTime(0);
    };

    /** Call this if user navigates away */
    const flush = async () => {
        if (prevPageRef.current === null) return;

        const now = performance.now();
        const diff = now - startTimeRef.current;
        const totalMs = accumulatedMsRef.current + diff;

        await commit(prevPageRef.current, totalMs);

        // reset
        accumulatedMsRef.current = 0;
        startTimeRef.current = performance.now();
        setElapsedTime(0);
    };

    // Flush on unmount
    useEffect(() => {
        return () => {
            void flush();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        elapsedTime,
        pageReadTime,
        onPageChange,
        flush,
    };
}
