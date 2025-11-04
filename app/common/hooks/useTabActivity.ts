'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Options = {
    /** Fire whenever activity state changes */
    onChange?: (state: {
        isVisible: boolean;
        isFocused: boolean;
        isActive: boolean;
        changedAt: number;
    }) => void;
    /** Consider the tab "inactive" after this idle time (ms) even if still visible/focused */
    idleMs?: number; // e.g., 60_000
};

export function useTabActivity(options: Options = {}) {
    const { onChange, idleMs } = options;

    const [isVisible, setIsVisible] = useState<boolean>(() =>
        typeof document !== 'undefined' ? !document.hidden : true
    );
    const [isFocused, setIsFocused] = useState<boolean>(() =>
        typeof document !== 'undefined' ? document.hasFocus() : true
    );
    const [lastInputAt, setLastInputAt] = useState<number>(() => Date.now());
    const idleTimerRef = useRef<number | null>(null);

    const isIdle = useMemo(
        () => (idleMs ? Date.now() - lastInputAt > idleMs : false),
        [idleMs, lastInputAt]
    );

    const isActive = isVisible && isFocused && !isIdle;
    const changedAtRef = useRef<number>(Date.now());

    // Internal: notify on change
    const notify = () => {
        if (!onChange) return;
        onChange({
            isVisible,
            isFocused,
            isActive,
            changedAt: changedAtRef.current,
        });
    };

    useEffect(() => {
        // Visibility (tab shown/hidden)
        const onVisibility = () => {
            changedAtRef.current = Date.now();
            setIsVisible(!document.hidden);
        };

        // Focus/blur (window focus)
        const onFocus = () => {
            changedAtRef.current = Date.now();
            setIsFocused(true);
        };
        const onBlur = () => {
            changedAtRef.current = Date.now();
            setIsFocused(false);
        };

        // Handle BFCache restores (Safari/iOS, etc.)
        const onPageShow = () => {
            changedAtRef.current = Date.now();
            setIsVisible(!document.hidden);
            setIsFocused(document.hasFocus());
        };

        // User input to reset idle timer
        const onUserInput = () => {
            setLastInputAt(Date.now());
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibility);
            window.addEventListener('focus', onFocus);
            window.addEventListener('blur', onBlur);
            window.addEventListener('pageshow', onPageShow);

            // Track input to prevent idle false positives
            window.addEventListener('pointerdown', onUserInput, { passive: true });
            window.addEventListener('keydown', onUserInput, { passive: true });
            window.addEventListener('scroll', onUserInput, { passive: true });
            window.addEventListener('mousemove', onUserInput, { passive: true });
        }

        return () => {
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibility);
                window.removeEventListener('focus', onFocus);
                window.removeEventListener('blur', onBlur);
                window.removeEventListener('pageshow', onPageShow);

                window.removeEventListener('pointerdown', onUserInput);
                window.removeEventListener('keydown', onUserInput);
                window.removeEventListener('scroll', onUserInput);
                window.removeEventListener('mousemove', onUserInput);
            }
        };
    }, []);

    // Idle polling (simple, cheap)
    useEffect(() => {
        if (!idleMs) return;
        const tick = () => {
            // Just update state if we crossed the threshold; React will dedupe if unchanged
            if (Date.now() - lastInputAt > idleMs) {
                // Force re-render to recompute isIdle via useMemo
                // (setLastInputAt to itself is a noop; instead, we can update a dummy timer)
            }
            idleTimerRef.current = window.setTimeout(tick, Math.min(1000, idleMs));
        };
        tick();
        return () => {
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
                idleTimerRef.current = null;
            }
        };
    }, [idleMs, lastInputAt]);

    // Fire onChange when any core flag flips
    useEffect(() => {
        notify();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible, isFocused, isIdle]);

    return { isVisible, isFocused, isActive, lastInputAt };
}
