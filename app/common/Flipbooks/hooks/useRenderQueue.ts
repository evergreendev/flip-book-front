import React, {useCallback, useEffect} from "react";

function useRenderQueue(
    currentPage: number,
    maxPages: number,
) {
    const maxPagesToRender = 1;
    const maxQueueLookAhead = 5;
    const [shouldClearQueue, setShouldClearQueue] = React.useState(false);
    const [renderedPages, setRenderedPages] = React.useState<Set<number>>(new Set());
    const [queue, setQueue] = React.useState<number[]>([]);
    const [shouldRenderList, setShouldRenderList] = React.useState(new Set<number>());
    const addPageToQueue = useCallback(async (page: number, isPriority?: boolean) => {
        if (renderedPages.has(page)||page>maxPages||page<1) return false;
        let wasFound = false;

        await new Promise(resolve => setTimeout(resolve, 1000));

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
    }, [maxPages, renderedPages]);

    useEffect(() => {
        if (shouldClearQueue) {
            console.log("clearing queue");
            setQueue([]);
            setRenderedPages(new Set());
            setShouldRenderList(new Set());
            setShouldClearQueue(false);
        }
    }, [shouldClearQueue]);


    useEffect(() => {
        const addPages = async () => {
            let i = currentPage;
            await addPageToQueue(i, true);

            let pagesAddedLeft = 0;
            let pagesAddedRight = 0;

            //first we add the page directly to the left and directly to the right to make sure page pairs render first
            await addPageToQueue(i - 1, true);
            await addPageToQueue(i + 1, true);

            //First we add the pages to the right
            while (i < maxPages && pagesAddedRight < maxQueueLookAhead) {
                i++;
                if (await addPageToQueue(i)) {
                    pagesAddedRight++;
                }
            }
            i = currentPage;

            //Then we look left
            while (i >= 1 && pagesAddedLeft < maxQueueLookAhead) {
                i--;
                if (await addPageToQueue(i)) {
                    pagesAddedLeft++;
                }
            }

            i = 1;
            //Then we add the rest
            while (i < maxPages) {
                i++;
                await addPageToQueue(i);
            }
        };
        addPages();
    }, [addPageToQueue, currentPage, maxPages])

    const dequeuePage = useCallback(() => {
        if (queue.length === 0) return null;
        const page = queue[0];

        setQueue(prev => prev.slice(1));

        return page;
    }, [queue]);

    useEffect(() => {
        if (shouldRenderList.size >= maxPagesToRender || queue.length === 0) return;

        const page = dequeuePage();

        if (page && !renderedPages.has(page)) {
            setShouldRenderList(prev => new Set([...prev, page]));
        }
    }, [dequeuePage, queue, renderedPages, shouldRenderList])

    const removeRenderedPages = useCallback(() => {
        setShouldRenderList(prev => {
            const newSet = new Set(prev);
            for (const page of renderedPages) {
                newSet.delete(page);
            }
            return newSet;
        })
    }, [renderedPages]);
    
    useEffect(() => {
        removeRenderedPages();
    },[removeRenderedPages]);

    return {
        shouldRenderList,
        setRenderedPages,
        setShouldClearQueue,
    }
}

export default useRenderQueue;
