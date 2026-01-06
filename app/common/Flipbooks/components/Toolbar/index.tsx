"use client"

import React, {useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Expand,
    Minimize2
} from 'lucide-react';
import Image from "next/image";
import logo from "@/public/logo.png"
import Link from "next/link";
import {useScreenSize} from "@/app/common/Flipbooks/hooks/useScreenSize";

interface ToolbarProps {
    setPage: (value: number | ((prevPage: number) => number)) => void,
    setZoomLevel: (value: number | ((prevZoom: number) => number)) => void,
    currentPage: number,
    totalPages: number,
    currentZoom: number,
    isFullScreen?: boolean,
    toggleFullScreen?: () => void,
    handleNextPage: (e: React.MouseEvent<HTMLButtonElement>) => void,
    handlePreviousPage: (e: React.MouseEvent<HTMLButtonElement>) => void,
    thumbNailArray: string[]
}

const Toolbar: React.FC<ToolbarProps> = React.memo(({
                                             setZoomLevel,
                                             currentPage,
                                             totalPages,
                                             setPage,
                                             currentZoom,
                                             isFullScreen,
                                             toggleFullScreen,
                                             handleNextPage,
                                             handlePreviousPage,
                                             thumbNailArray
                                         }) => {
    const [isSinglePage, setIsSinglePage] = React.useState(true);
    const [showTooltip, setShowTooltip] = React.useState(false);
    const [rangeInternalPage, setRangeInternalPage] = React.useState(currentPage);//This is so we can set the current page to this only when the range is released
    const [showPageInput, setShowPageInput] = React.useState(false);
    const [pageInputValue, setPageInputValue] = React.useState("");
    const rangeRef = React.useRef<HTMLInputElement>(null);

    // Helper function to adjust page number according to the requirement
    // The current page should always be odd, except when it's the last page
    const adjustPageNumber = (page: number): number => {
        // If it's the last page, return as is
        if (page === totalPages) {
            return page;
        }

        // If the page is even, increment it to make it odd
        return page % 2 === 0 ? page + 1 : page;
    };

    const handleZoomIn = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setZoomLevel(prev => Math.min(prev + 0.1, 2.0));
    };

    const handleZoomOut = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setZoomLevel(prev => Math.max(prev - 0.1, 1));
    };

    const handleResetZoom = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setZoomLevel(1.0);
    };

    const {isBelow1000px} = useScreenSize();

    useEffect(() => {
        if (isBelow1000px || (currentPage === 1 && currentPage !== totalPages) || (rangeInternalPage === totalPages)) {
            setIsSinglePage(true);
        } else {
            setIsSinglePage(false);
        }
    }, [currentPage, isBelow1000px, rangeInternalPage, totalPages]);

    function handlePageRangeRelease() {
        setShowTooltip(false);
        const newPage = adjustPageNumber(rangeInternalPage);
        setPage(newPage);
    }

    useEffect(() => {
        setRangeInternalPage(currentPage);
        // Reset page input when page changes
        setShowPageInput(false);
        setPageInputValue("");
    }, [currentPage]);

    return (
        <div
            className="flex items-center justify-between flex-wrap w-full border-b-2 border-b-[#75b543] bg-neutral-900 text-white p-2 pb-0 shadow-md">
            <div className="flex items-center space-x-2 mx-auto">
                <Link href="https://egmrc.com" passHref={true} className="w-24">
                    <Image className="grayscale" src={logo} alt="Evergreen Media"/>
                </Link>
                {!isBelow1000px
                    && <><Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleZoomOut(e)}
                        disabled={currentZoom <= 1}
                        title="Zoom out"
                    >
                        <ZoomOut className="h-4 w-4"/>
                    </Button>

                        <div className="text-sm w-16 text-center">
                            {Math.round(currentZoom * 100)}%
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => handleZoomIn(e)}
                            disabled={currentZoom >= 2.0}
                            title="Zoom in"
                        >
                            <ZoomIn className="h-4 w-4"/>
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleResetZoom(e)}
                            disabled={currentZoom === 1.0}
                            title="Reset zoom"
                        >
                            <RotateCw className="h-4 w-4"/>
                        </Button>

                        {toggleFullScreen && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleFullScreen}
                                title={isFullScreen ? "Exit full screen" : "Enter full screen"}
                            >
                                {isFullScreen ? <Minimize2 className="h-4 w-4"/> : <Expand className="h-4 w-4"/>}
                            </Button>
                        )}</>}

            </div>
            <div className="flex items-center space-x-2 sm:w-auto mx-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handlePreviousPage(e)}
                    disabled={currentPage <= 1}
                    title="Previous page"
                >
                    <ChevronLeft className="h-4 w-4"/>
                </Button>

                <div className="text-sm w-44 text-center">
                    {showPageInput ? (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const pageNum = parseInt(pageInputValue);
                            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= Math.max(0, totalPages - 2)) {
                                // Add 2 to account for cover and first page
                                const actualPage = pageNum + 2;
                                const newPage = adjustPageNumber(actualPage);
                                setPage(newPage);
                                setShowPageInput(false);
                            }
                            setPageInputValue("");
                        }}>
                            <input
                                type="text"
                                className="w-16 text-center bg-gray-700 text-white rounded px-2 py-1"
                                value={pageInputValue}
                                onChange={(e) => setPageInputValue(e.target.value)}
                                onBlur={() => {
                                    setShowPageInput(false);
                                    setPageInputValue("");
                                }}
                                autoFocus
                                placeholder="Page #"
                            />
                        </form>
                    ) : (
                        <div 
                            className="cursor-pointer hover:underline inline-block" 
                            onClick={() => setShowPageInput(true)}
                            title="Click to go to specific page"
                        >
                            <span className="font-medium">
                                {isSinglePage ? Math.max(0, currentPage - 2) : `${Math.max(0, currentPage - 3)} - ${Math.max(0, currentPage - 2)}`}
                            </span> of <span className="font-medium">{Math.max(0, totalPages - 2)}</span>
                        </div>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleNextPage(e)}
                    disabled={currentPage >= totalPages}
                    title="Next page"
                >
                    <ChevronRight className="h-4 w-4"/>
                </Button>
            </div>
            <div className="mx-auto relative w-[calc(100vw-7rem)] z-50">
                <input
                    className="w-full appearance-none bg-gray-200 h-2 rounded-lg cursor-pointer"
                    ref={rangeRef}
                    value={rangeInternalPage}
                    type="range"
                    min={1}
                    max={totalPages}
                    step={isBelow1000px || currentPage + 1 === totalPages || currentPage === totalPages ? 1 : 2}
                    onChange={(e) => {
                        setRangeInternalPage(e.target.valueAsNumber);
                    }}
                    onMouseDown={() => setShowTooltip(true)}
                    onMouseUp={handlePageRangeRelease}
                    onTouchStart={() => setShowTooltip(true)}
                    onTouchEnd={handlePageRangeRelease}
                />
                {showTooltip && rangeRef.current && (
                    <div
                        className="absolute bg-black text-white px-2 py-1 rounded text-sm w-28 text-center"
                        style={{
                            left: `${((rangeInternalPage - 1) / (totalPages - 1)) * 100}%`,
                            transform: 'translateX(-50%)',
                            bottom: '100%',
                            marginBottom: '8px'
                        }}
                    >
                        <div className="flex">
                            {!isSinglePage &&
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumbNailArray[rangeInternalPage - 2]} className="grow w-6/12 z-50" alt=""/>}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumbNailArray[rangeInternalPage - 1]} className={`w-6/12 grow z-50`} alt=""/>
                        </div>

                        {isSinglePage ? Math.max(0, rangeInternalPage - 2) : `${Math.max(0, rangeInternalPage - 3)} - ${Math.max(0, rangeInternalPage - 2)}`}
                    </div>
                )}
            </div>
        </div>
    );
});

Toolbar.displayName = "Toolbar";

export default Toolbar;
