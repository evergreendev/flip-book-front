import React, {useCallback, useEffect} from "react";

function useRenderQueue(
    currentPage: number,
    maxPages: number,
    zoomLevel?: number,
) {
    const maxPagesToRender = 3;
    const maxQueueLookAhead = 5;
    const [shouldClearQueue, setShouldClearQueue] = React.useState(false);
    const [renderedPages, setRenderedPagesState] = React.useState<Set<number>>(new Set());
    const renderedPagesRef = React.useRef<Set<number>>(new Set());

    const prevZoomLevelRef = React.useRef<number | undefined>(zoomLevel);

    useEffect(() => {
        if (zoomLevel !== undefined && prevZoomLevelRef.current !== undefined && zoomLevel !== prevZoomLevelRef.current) {
            setShouldClearQueue(true);
        }
        prevZoomLevelRef.current = zoomLevel;
    }, [zoomLevel]);

    const setRenderedPages = React.useCallback((update: React.SetStateAction<Set<number>>) => {
        setRenderedPagesState(prev => {
            const next = typeof update === 'function' ? (update as (prev: Set<number>) => Set<number>)(prev) : update;
            
            if (next.size === prev.size) {
                let isIdentical = true;
                for (const val of next) {
                    if (!prev.has(val)) {
                        isIdentical = false;
                        break;
                    }
                }
                if (isIdentical) return prev;
            }
            
            renderedPagesRef.current = next;
            return next;
        });
    }, []);

    const [queue, setQueue] = React.useState<number[]>([]);
    const queueRef = React.useRef<number[]>([]);
    
    // Sync queueRef with queue state
    React.useEffect(() => {
        queueRef.current = queue;
    }, [queue]);

    const [shouldRenderList, setShouldRenderList] = React.useState(new Set<number>());
    const addPageToQueue = useCallback(async (page: number, isPriority?: boolean) => {
        if (renderedPagesRef.current.has(page)||page>maxPages||page<1) return false;
        let wasFound = false;

        setQueue(prev => {
            const foundIndex = prev.includes(page);
            wasFound = foundIndex;

            if (isPriority) {
                if (foundIndex){
                    const queueWithTargetRemoved = prev.filter(x => x !== page);
                    return [page, ...queueWithTargetRemoved];
                }

                return [page, ...prev]
            } else{
                if (foundIndex) return prev;

                return [...prev, page]
            }
        });
        return wasFound;
    }, [maxPages]);

    useEffect(() => {
        if (shouldClearQueue) {
            setQueue([]);
            setRenderedPages(new Set());
            setShouldRenderList(new Set());
            setShouldClearQueue(false);
        }
    }, [shouldClearQueue]);


    useEffect(() => {
        let isCancelled = false;
        const addPages = async () => {
            let i = currentPage;
            await addPageToQueue(currentPage, true);
            if (isCancelled) return;

            //we add the page directly to the left and directly to the right to make sure page pairs render first
            await addPageToQueue(currentPage - 1, true);
            if (isCancelled) return;
            await addPageToQueue(currentPage + 1, true);
            if (isCancelled) return;

            let pagesAddedLeft = 0;
            let pagesAddedRight = 0;

            //First we add the pages to the right
            while (i < maxPages && pagesAddedRight < maxQueueLookAhead) {
                if (isCancelled) return;
                i++;
                if (await addPageToQueue(i)) {
                    pagesAddedRight++;
                }
            }
            i = currentPage;

            //Then we look left
            while (i >= 1 && pagesAddedLeft < maxQueueLookAhead) {
                if (isCancelled) return;
                i--;
                if (await addPageToQueue(i, pagesAddedLeft < 2)) {
                    pagesAddedLeft++;
                }
            }

            i = 1;
            //Then we add the rest
            while (i < maxPages) {
                if (isCancelled) return;
                i++;
                await addPageToQueue(i);
            }
        };

        if (!shouldClearQueue){
            addPages();
        }

        return () => {
            isCancelled = true;
        };
    }, [addPageToQueue, currentPage, maxPages, shouldClearQueue])


    useEffect(() => {
        if (shouldRenderList.size >= maxPagesToRender || queue.length === 0) return;

        setQueue(prevQueue => {
            const nextQueue = [...prevQueue];
            const pagesToAdd: number[] = [];
            
            while (nextQueue.length > 0 && (shouldRenderList.size + pagesToAdd.length) < maxPagesToRender) {
                const page = nextQueue.shift();
                if (page !== undefined && page !== null && !renderedPagesRef.current.has(page) && !shouldRenderList.has(page)) {
                    pagesToAdd.push(page);
                }
            }
            
            if (pagesToAdd.length > 0) {
                setShouldRenderList(prevList => {
                    const nextList = new Set(prevList);
                    pagesToAdd.forEach(p => nextList.add(p));
                    return nextList;
                });
            }
            
            return nextQueue;
        });
    }, [queue.length, shouldRenderList.size, maxPagesToRender]);

    const removeRenderedPages = useCallback(() => {
        setShouldRenderList(prev => {
            let changed = false;
            const next = new Set(prev);
            for (const page of renderedPages) {
                if (next.has(page)) {
                    next.delete(page);
                    changed = true;
                }
            }
            return changed ? next : prev;
        })
    }, [renderedPages]);
    
    useEffect(() => {
        removeRenderedPages();
    },[removeRenderedPages]);

    return {
        shouldRenderList,
        setRenderedPages,
        setShouldClearQueue,
        renderedPages,
        shouldClearQueue
    }
}

export default useRenderQueue;
