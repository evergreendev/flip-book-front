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
    handleNextPage: (e: React.MouseEvent<HTMLButtonElement>) => void
    handlePreviousPage: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const Toolbar: React.FC<ToolbarProps> = ({
                                             setZoomLevel,
                                             currentPage,
                                             totalPages,
                                             setPage,
                                             currentZoom,
                                             isFullScreen,
                                             toggleFullScreen,
                                             handleNextPage,
                                             handlePreviousPage,
                                         }) => {
    const [isSinglePage, setIsSinglePage] = React.useState(true);
    const [showTooltip, setShowTooltip] = React.useState(false);
    const [rangeInternalPage, setRangeInternalPage] = React.useState(currentPage);//This is so we can set the current page to this only when the range is released
    const rangeRef = React.useRef<HTMLInputElement>(null);

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
        if (isBelow1000px || (currentPage === 1 && currentPage === totalPages) || (rangeInternalPage === 1 && rangeInternalPage === totalPages)) {
            setIsSinglePage(true);
        } else {
            setIsSinglePage(false);
        }
    }, [currentPage, isBelow1000px, rangeInternalPage, totalPages]);

    function handlePageRangeRelease() {
        setShowTooltip(false);
        setPage(rangeInternalPage);
    }

    useEffect(() => {
        setRangeInternalPage(currentPage);
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
                    <span
                        className="font-medium">{isSinglePage ? currentPage : `${currentPage - 1} - ${currentPage}`}</span> of <span
                    className="font-medium">{totalPages}</span>
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
            <div className="relative w-full">
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
                        className="absolute bg-black text-white px-2 py-1 rounded text-sm"
                        style={{
                            left: `${((rangeInternalPage - 1) / (totalPages - 1)) * 100}%`,
                            transform: 'translateX(-50%)',
                            bottom: '100%',
                            marginBottom: '8px'
                        }}
                    >
                        {isSinglePage ? rangeInternalPage : `${rangeInternalPage - 1} - ${rangeInternalPage}`}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Toolbar;
