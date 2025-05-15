import React, {useCallback, useEffect} from "react";

function useRenderQueue(
    currentPage: number,
    maxPages: number,
    shouldClearQueue: boolean
) {
    const maxPagesToRender = 3;
    const maxNextPagesToRender = 5;
    const [renderedPages, setRenderedPages] = React.useState<Set<number>>(new Set());
    const [queue, setQueue] = React.useState<number[]>([]);
    const [shouldRenderList, setShouldRenderList] = React.useState(new Set<number>());
    const addPageToQueue = useCallback((page:number) => {
        if (renderedPages.has(page)) return false;

        setQueue(prev => {
            const isAlreadyInQueue = prev.includes(page);

            if (isAlreadyInQueue) return prev;

            return [...prev, page]
        });
        return true;
    }, [renderedPages]);


    useEffect(() => {
        let i = currentPage;
        addPageToQueue(i);

        let pagesAdded = 1;

        //first we add the page directly to the left and directly to the right to make sure page pairs render first
        addPageToQueue(i - 1);
        addPageToQueue(i + 1);

        //First we add the pages to the right
        while (i < maxPages && pagesAdded < maxNextPagesToRender) {
            i++;
            if (addPageToQueue(i)) {
                pagesAdded++;
            }
        }
        i = currentPage;

        //Then we look left
        while (i >= 1 && pagesAdded < maxPagesToRender) {
            i--;
            if (addPageToQueue(i)) {
                pagesAdded++;
            }
        }
    }, [addPageToQueue, currentPage, maxPages])

    useEffect(() => {
        console.log("queue", queue);
    }, [queue]);

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

    useEffect(() => {
        console.log("rendered pages", renderedPages);
    }, [renderedPages]);

    return {
        shouldRenderList,
        setRenderedPages,
    }
}

export default useRenderQueue;
