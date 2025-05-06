"use client"

import React from 'react';
import {Button} from '@/components/ui/button';
import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    RotateCw
} from 'lucide-react';

interface ToolbarProps {
    setPage: (value: number | ((prevPage: number) => number)) => void,
    setZoomLevel: (value: number | ((prevZoom: number) => number)) => void,
    currentPage: number,
    totalPages: number,
    currentZoom: number,
    setAnimationDirection: (value: (((prevState: ("left" | "right")) => ("left" | "right")) | "left" | "right")) => void
}

const Toolbar: React.FC<ToolbarProps> = ({
                                             setPage,
                                             setZoomLevel,
                                             currentPage,
                                             totalPages,
                                             currentZoom,
                                             setAnimationDirection
                                         }) => {
    const handlePreviousPage = () => {
        setAnimationDirection("right")
        setPage(prev => {
            // If we're at page 3 or higher, generally flip 2 pages back
            if (prev > 2) {
                // If we're at the last page of an even-numbered total, move back just 1 page
                if (totalPages % 2 !== 1 && prev === totalPages) {
                    return prev - 1;
                }
                return prev - 2;
            }
            // If we're at page 2, go to page 1
            else if (prev === 2) {
                return 1;
            }
            // Otherwise stay at page 1
            return 1;
        });
    };

    const handleNextPage = () => {
        setAnimationDirection("left");
        setPage(prev => {
            // If we're at the second-to-last page of an odd-numbered total, move to the last page
            if (totalPages % 2 === 1 && prev === totalPages - 1) {
                return totalPages;
            }
            // If we can flip 2 pages forward without exceeding total pages
            else if (prev + 2 <= totalPages) {
                return prev + 2;
            }
            // If we're one page away from the end, go to the last page
            else if (prev + 1 <= totalPages) {
                return totalPages;
            }
            // Otherwise stay at the current page
            return prev;
        });
    };

    const handleZoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 0.1, 2.0));
    };

    const handleZoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
    };

    const handleResetZoom = () => {
        setZoomLevel(1.0);
    };

    return (
        <div className="flex items-center justify-between w-full bg-white dark:bg-slate-800 p-2 rounded-md shadow-md">
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousPage}
                    disabled={currentPage <= 1}
                    title="Previous page"
                >
                    <ChevronLeft className="h-4 w-4"/>
                </Button>

                <div className="text-sm">
                    Page <span className="font-medium">{currentPage}</span> of <span
                    className="font-medium">{totalPages}</span>
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    title="Next page"
                >
                    <ChevronRight className="h-4 w-4"/>
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={currentZoom <= 0.5}
                    title="Zoom out"
                >
                    <ZoomOut className="h-4 w-4"/>
                </Button>

                <div className="text-sm w-16 text-center">
                    {Math.round(currentZoom * 100)}%
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={currentZoom >= 2.0}
                    title="Zoom in"
                >
                    <ZoomIn className="h-4 w-4"/>
                </Button>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleResetZoom}
                    disabled={currentZoom === 1.0}
                    title="Reset zoom"
                >
                    <RotateCw className="h-4 w-4"/>
                </Button>
            </div>
        </div>
    );
};

export default Toolbar;
