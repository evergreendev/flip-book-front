"use client"
import React, {HTMLAttributes, useCallback, useContext, useEffect, useRef, useState} from "react";
import ModeContext from "@/app/(admin)/admin/(protected)/dashboard/edit/context/ModeContext";
import {usePdfCache} from "@/app/common/Flipbooks/hooks/PdfCacheHook";
import {Overlay} from "../types";
import Page from "@/app/common/Flipbooks/components/Page";
import {animated, to, useSpring} from "@react-spring/web";
import Toolbar from "@/app/common/Flipbooks/components/Toolbar";
import {ChevronLeft, ChevronRight,} from 'lucide-react';
import {PDFDocumentProxy} from "pdfjs-dist";
import {v4 as uuidv4} from "uuid";
import { useRouter, useSearchParams } from "next/navigation";

async function generateOverlays(
    currPage: number,
    pdf: PDFDocumentProxy,
    mode: { flipBookId: string; }) {
    const page = await pdf.getPage(currPage);
    const structureTree = await page.getTextContent();

    const newOverlays: Overlay[] = [];

    function extractEmails(text:string) {
        const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/gi;
        return text.match(emailRegex) || null;
    }

    // Function to extract URL from text
    const extractUrl = (text: string): string | null => {
        // Regular expression to match URLs
        // This will match URLs with or without http/https prefix
        const urlRegex = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&\/=]*)/gi;
        const matches = text.match(urlRegex);

        function hasTopLevelDomain(url: string) {
            const tlds = [
                "com", "org", "net", "edu", "gov", "mil", "int",
                "co", "io", "ai", "app", "dev", "me", "info", "biz", "xyz", "online", "site", "top", "tech", "store", "club", "blog", "cloud",
                "us", "uk", "de", "ca", "au", "jp", "cn", "fr", "in", "it", "es", "nl", "br", "ru", "ch", "se", "no", "fi", "mx", "pl", "kr", "tr",
                "be", "at", "dk", "cz", "gr", "nz", "za", "pt", "hu", "ar", "sg", "hk", "il", "ie", "my", "ph", "th", "vn", "id", "ro", "sk", "bg",
                "lt", "lv", "ee", "si", "hr", "ua", "by", "is", "lu", "rs", "ba"
            ];

            return tlds.find(tld => url.includes(tld));
        }


        if (matches && matches.length > 0) {
            // Clean up the extracted URL to remove any trailing punctuation or unwanted characters
            let url = matches[0];
            // Remove trailing punctuation that might have been captured
            url = url.replace(/[.,;:!?)]$/, '');
            if (hasTopLevelDomain(url)){
                return extractEmails(url) ? "mailto:"+url: "https://"+url;
            }
        }

        return null;
    };
    console.log("generating page ", currPage);

    structureTree.items.forEach((item) => {
        if (!("str" in item)) return;

        const extractedUrl = extractUrl(item.str);

        if (extractedUrl) {
            const transform = item.transform;
            const x = transform[4];
            const y = transform[5];
            const width = item.width;
            const height = item.height;

            newOverlays.push({
                id: uuidv4(),
                flipbook_id: mode.flipBookId,
                h: height,
                page: currPage,
                url: extractedUrl,
                w: width,
                x: x,
                y: y
            })
        }
    })

    return newOverlays;
}

export default function Flipbook({
                                     pdfUrl,
                                     initialOverlays,
                                     formOverlays,
                                     overlaysToDelete,
                                     activeOverlayId,
                                     setFormOverlays,
                                     setShouldGenerateOverlays,
                                     shouldGenerateOverlays,
                                     setActiveOverlayId,
                                     setOverlaysToDelete,
                                     setOverlaysToRender
                                 }: {
    pdfUrl: string,
    initialOverlays: Overlay[] | null,
    setFormOverlays?: React.Dispatch<React.SetStateAction<Overlay[] | null>>
    setShouldGenerateOverlays?: React.Dispatch<React.SetStateAction<boolean>>
    shouldGenerateOverlays?: boolean
    formOverlays?: Overlay[] | null,
    overlaysToDelete?: string[],
    activeOverlayId?: string | null,
    setActiveOverlayId?: (value: (((prevState: (string | null)) => (string | null)) | string | null)) => void,
    setOverlaysToDelete?: (value: (((prevState: string[]) => string[]) | string[])) => void,
    setOverlaysToRender?: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void
}) {
    const formattedInitialOverlays: Overlay[][] = [];
    if (initialOverlays && initialOverlays?.length > 0) {
        initialOverlays.forEach(overlay => {
            if (formattedInitialOverlays[overlay.page - 1]) {
                formattedInitialOverlays[overlay.page - 1].push(overlay);
            } else {
                formattedInitialOverlays[overlay.page - 1] = [overlay];
            }
        })
    }
    const [maxPage, setMaxPage] = useState<number | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [currPage, setCurrPage] = useState(1);
    const [renderedPages, setRenderedPages] = useState(new Set<number>());
    const [overlays, setOverlays] = useState<Overlay[][]>(formattedInitialOverlays);
    const [animationDirection, setAnimationDirection] = useState<"left" | "right">("left");
    const [flipbookWidth, setFlipbookWidth] = useState<number>(0);
    const [flipbookHeight, setFlipbookHeight] = useState<number>(0);
    const [zoomLevel, setZoomLevel] = useState<number>(1.0);
    const [panPosition, setPanPosition] = useState<{ x: number, y: number }>({x: 0, y: 0});
    const [isPanning, setIsPanning] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStartX, setDragStartX] = useState<number>(0);
    const [dragCurrentX, setDragCurrentX] = useState<number>(0);
    const [dragProgress, setDragProgress] = useState<number>(0); // -1 to 1 value indicating drag progress
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
    const flipbookContainerRef = useRef<HTMLDivElement>(null);
    const mode = useContext(ModeContext);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [gradientSpring, gradientApi] = useSpring(() => ({
        from: {
            rotation: 0,
            g1: 0,
            g2: 0,
            g3: 0,
        },
        to: {
            rotation: 45,
            g1: 1,
            g2: 1,
            g3: 1,
        }
    }));

    const {loadPdf, prefetchPdf} = usePdfCache();

    //The effect for generating new overlays
    useEffect(() => {
        if (!maxPage || !shouldGenerateOverlays || isGenerating) return;

        setIsGenerating(true);
        async function generate() {
            if (!maxPage) return;

            const pdf = await loadPdf(pdfUrl);

            for (let i = 1; i <= maxPage; i++) {
                const newOverlays = await generateOverlays(i, pdf, mode)

                if (setFormOverlays){
                    setFormOverlays(prevState => prevState ? [...prevState, ...newOverlays] : newOverlays);
                }
                if (setOverlaysToRender){
                    setOverlaysToRender(prevState => prevState ? [...prevState, ...newOverlays] : newOverlays);
                }
            }
        }

        generate().then(()=>{
            if (setShouldGenerateOverlays){
                setShouldGenerateOverlays(false);
            }
            setIsGenerating(false);
        });

    }, [shouldGenerateOverlays, maxPage, loadPdf, pdfUrl, mode, setShouldGenerateOverlays, setFormOverlays, isGenerating, setOverlaysToRender]);

    useEffect(() => {
        let isMounted = true;

        (async function () {
            try {
                // Use the cached PDF loader
                const pdf = await loadPdf(pdfUrl);

                if (!isMounted) return;
                setMaxPage(pdf.numPages);

                prefetchPdf(pdfUrl);

            } catch (error) {
                console.error("Error loading PDF:", error);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [pdfUrl, initialOverlays, mode, setFormOverlays, loadPdf, prefetchPdf]);

    // Check for page parameter in URL when component loads
    useEffect(() => {
        const pageParam = searchParams.get('page');
        if (pageParam && maxPage) {
            const pageNumber = parseInt(pageParam, 10);
            // Ensure the page number is valid
            if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= maxPage) {
                setCurrPage(pageNumber);
            }
        }
    }, [searchParams, maxPage]);


    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only enable panning if:
        // 1. Zoom level is greater than 1.0
        // 2. The target is not an overlay canvas (which needs its own interactions)
        if (zoomLevel > 1.0) {
            setIsPanning(true);
        } else if (mode.mode !== "edit") {
            // Start tracking drag for page turning (only if not in edit mode)
            setIsDragging(true);
            setDragStartX(e.clientX);
            setDragCurrentX(e.clientX);
        }
    };

    // Function to constrain pan position within reasonable bounds
    const constrainPanPosition = useCallback((x: number, y: number): { x: number, y: number } => {
        // Calculate the maximum pan distance based on zoom level and flipbook dimensions
        const maxPanX = Math.max(0, flipbookWidth * (zoomLevel - 1) / 2);
        const maxPanY = Math.max(0, flipbookHeight * (zoomLevel - 1) / 2);

        return {
            x: Math.max(-maxPanX, Math.min(maxPanX, x)),
            y: Math.max(-maxPanY, Math.min(maxPanY, y))
        };
    }, [flipbookWidth, flipbookHeight, zoomLevel]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only update pan position if actively panning
        if (isPanning && zoomLevel > 1.0) {
            setPanPosition(prev => {
                const newPos = {
                    x: prev.x + e.movementX,
                    y: prev.y + e.movementY
                };
                return constrainPanPosition(newPos.x, newPos.y);
            });
            // Prevent default behavior to avoid text selection during panning
            e.preventDefault();
        } else if (isDragging && mode.mode !== "edit") {
            // Update current drag position for page turning (only if not in edit mode)
            setDragCurrentX(e.clientX);

            // Calculate drag progress (-1 to 1)
            const dragDistance = e.clientX - dragStartX;
            const dragThreshold = flipbookWidth * 0.1;
            const progress = Math.max(-1, Math.min(1, dragDistance / dragThreshold));
            setDragProgress(progress);

            e.preventDefault();
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsPanning(false);

        if (isDragging && mode.mode !== "edit") {
            const dragDistance = dragCurrentX - dragStartX;
            const dragThreshold = flipbookWidth * 0.1; // 10% of flipbook width as threshold

            // If drag distance exceeds threshold, trigger page turn (only if not in edit mode)
            if (Math.abs(dragDistance) > dragThreshold) {
                if (dragDistance > 0) {
                    // Dragged right (positive distance), go to previous page
                    handlePreviousPage(e as unknown as React.MouseEvent<HTMLButtonElement>);
                } else {
                    // Dragged left (negative distance), go to next page
                    handleNextPage(e as unknown as React.MouseEvent<HTMLButtonElement>);
                }
            }

            // Reset drag state
            setIsDragging(false);
            setDragStartX(0);
            setDragCurrentX(0);
            setDragProgress(0);
        } else if (isDragging) {
            // Reset drag state even in edit mode
            setIsDragging(false);
            setDragStartX(0);
            setDragCurrentX(0);
            setDragProgress(0);
        }
    };

    // Touch event handlers for mobile devices
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (zoomLevel > 1.0) {
            setIsPanning(true);
        } else if (mode.mode !== "edit") {
            // Start tracking drag for page turning (only if not in edit mode)
            setIsDragging(true);
            setDragStartX(e.touches[0].clientX);
            setDragCurrentX(e.touches[0].clientX);
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (isPanning && zoomLevel > 1.0) {
            // Touch panning logic would go here
            // For simplicity, we're not implementing full touch panning in this update
        } else if (isDragging && mode.mode !== "edit") {
            // Update current drag position for page turning (only if not in edit mode)
            setDragCurrentX(e.touches[0].clientX);

            // Calculate drag progress (-1 to 1)
            const dragDistance = e.touches[0].clientX - dragStartX;
            const dragThreshold = flipbookWidth * 0.1;
            const progress = Math.max(-1, Math.min(1, dragDistance / dragThreshold));
            setDragProgress(progress);

            e.preventDefault(); // Prevent scrolling while dragging
        }
    };

    const handleTouchEnd = () => {
        setIsPanning(false);

        if (isDragging && mode.mode !== "edit") {
            const dragDistance = dragCurrentX - dragStartX;
            const dragThreshold = flipbookWidth * 0.1; // 10% of flipbook width as threshold

            // If drag distance exceeds threshold, trigger page turn (only if not in edit mode)
            if (Math.abs(dragDistance) > dragThreshold) {
                if (dragDistance > 0) {
                    // Swiped right (positive distance), go to previous page
                    handlePreviousPage({} as React.MouseEvent<HTMLButtonElement>);
                } else {
                    // Swiped left (negative distance), go to next page
                    handleNextPage({} as React.MouseEvent<HTMLButtonElement>);
                }
            }

            // Reset drag state
            setIsDragging(false);
            setDragStartX(0);
            setDragCurrentX(0);
            setDragProgress(0);
        } else if (isDragging) {
            // Reset drag state even in edit mode
            setIsDragging(false);
            setDragStartX(0);
            setDragCurrentX(0);
            setDragProgress(0);
        }
    };

    const toggleFullScreen = () => {
        if (!isFullScreen) {
            if (flipbookContainerRef.current) {
                // Try standard method first
                if (flipbookContainerRef.current.requestFullscreen) {
                    flipbookContainerRef.current.requestFullscreen()
                        .catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message}`));
                }
                    // Fallbacks for various browsers
                //@ts-expect-error document fallback
                else if ((flipbookContainerRef.current).mozRequestFullScreen) {
                    //@ts-expect-error document fallback
                    (flipbookContainerRef.current).mozRequestFullScreen();
                }
                //@ts-expect-error document fallback
                else if ((flipbookContainerRef.current).webkitRequestFullscreen) {
                    //@ts-expect-error document fallback
                    (flipbookContainerRef.current).webkitRequestFullscreen();
                }
                //@ts-expect-error document fallback
                else if ((flipbookContainerRef.current).msRequestFullscreen) {
                    //@ts-expect-error document fallback
                    (flipbookContainerRef.current).msRequestFullscreen();
                } else {
                    console.warn("Fullscreen API is not supported in this browser");
                }
            }
        } else {
            // Try standard method first
            if (document.exitFullscreen) {
                document.exitFullscreen()
                    .catch(err => console.error(`Error attempting to exit full-screen mode: ${err.message}`));
            }
                // Fallbacks for various browsers
            //@ts-expect-error document fallback
            else if ((document).mozCancelFullScreen) {
                //@ts-expect-error document fallback
                (document).mozCancelFullScreen();
            }
            //@ts-expect-error document fallback
            else if ((document).webkitExitFullscreen) {
                //@ts-expect-error document fallback
                (document).webkitExitFullscreen();
            }
            //@ts-expect-error document fallback
            else if ((document).msExitFullscreen) {
                //@ts-expect-error document fallback
                (document).msExitFullscreen();
            }
        }
    };

    // Reset pan position when zoom level is reset to 1.0
    // or constrain it when zoom level changes
    useEffect(() => {
        if (zoomLevel === 1.0) {
            setPanPosition({x: 0, y: 0});
        } else {
            // Constrain the current pan position based on the new zoom level
            setPanPosition(prev => constrainPanPosition(prev.x, prev.y));
        }
    }, [zoomLevel, flipbookWidth, flipbookHeight, constrainPanPosition]);

    const flipbookRef = useCallback((node: HTMLDivElement) => {
        if (node !== null) {
            // This runs when the DOM node is available
            const rect = node.getBoundingClientRect();
            setFlipbookWidth(rect.width);
            setFlipbookHeight(rect.height);

            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    setFlipbookWidth(entry.contentRect.width);
                    setFlipbookHeight(entry.contentRect.height);
                }
            });

            resizeObserver.observe(node);

            // Store the observer to disconnect it later
            const currentObserver = resizeObserver;
            return () => currentObserver.disconnect();
        }
    }, []);

    useEffect(() => {
        if (!maxPage) return;

        setRenderedPages((renderedPages) => {
            const updatedRenderedPages = new Set(renderedPages);
            updatedRenderedPages.add(currPage);
            updatedRenderedPages.add(currPage + 1);
            updatedRenderedPages.add(currPage + 2);
            updatedRenderedPages.add(currPage + 3);
            updatedRenderedPages.add(currPage + 4);
            updatedRenderedPages.add(currPage - 1);
            updatedRenderedPages.add(currPage - 2);
            updatedRenderedPages.add(currPage - 3);
            updatedRenderedPages.add(currPage - 4);

            return updatedRenderedPages
        });
    }, [maxPage, currPage]);

    useEffect(() => {
        if (initialOverlays && maxPage) {
            const formattedOverlays: Overlay[][] = [];
            for (let i = 0; i < maxPage; i++) {
                formattedOverlays.push([]);
            }
            initialOverlays.forEach(overlay => {
                if (formattedOverlays[overlay.page - 1]) {
                    formattedOverlays[overlay.page - 1].push(overlay);
                } else {
                    formattedOverlays[overlay.page - 1] = [overlay];
                }
            });
            setOverlays(formattedOverlays);
        }
    }, [initialOverlays, maxPage]);
    // Effect to listen for fullscreen change events
    useEffect(() => {
        const handleFullScreenChange = () => {
            const isInFullScreen =
                !!document.fullscreenElement ||
                //@ts-expect-error Deprecated Mozilla fullscreen API
                !!(document).mozFullScreenElement ||
                //@ts-expect-error Webkit fullscreen API
                !!(document).webkitFullscreenElement ||
                //@ts-expect-error Microsoft fullscreen API
                !!(document).msFullscreenElement;

            setIsFullScreen(isInFullScreen);
        };

        // Add event listeners for all browser variants
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        document.addEventListener('mozfullscreenchange', handleFullScreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
        document.addEventListener('MSFullscreenChange', handleFullScreenChange);

        return () => {
            // Remove all event listeners on cleanup
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
        };
    }, []);

    // Effect to trigger gradient animation when current page changes
    useEffect(() => {
        if (animationDirection === "left") {
            gradientApi.start({
                to: {
                    g1: 0,
                    g2: 0,
                    g3: 0,
                    rotation: 90
                },
                from: {
                    g1: 68,
                    g2: 80,
                    g3: 93,
                    rotation: 133
                },

            });
        } else {
            gradientApi.start({
                from: {
                    g1: 0,
                    g2: 7,
                    g3: 23,
                    rotation: 136
                },
                to: {
                    g1: 100,
                    g2: 100,
                    g3: 100,
                    rotation: 90
                },
            });
        }

    }, [animationDirection, currPage, gradientApi]);

    // Helper function to update URL with page parameter
    const updateUrlWithPage = (pageNumber: number) => {
        // Create a new URLSearchParams object with the current query parameters
        const params = new URLSearchParams(searchParams.toString());
        // Set the page parameter
        params.set('page', pageNumber.toString());
        // Update the URL without refreshing the page
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handlePreviousPage = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        if (!maxPage) return;

        setAnimationDirection("right")
        setCurrPage(prev => {
            let newPage;
            // If we're at page 3 or higher, generally flip 2 pages back
            if (prev > 2) {
                // If we're at the last page of an even-numbered total, move back just 1 page
                if (maxPage % 2 !== 1 && prev === maxPage) {
                    newPage = prev - 1;
                } else {
                    newPage = prev - 2;
                }
            }
            // If we're at page 2, go to page 1
            else if (prev === 2) {
                newPage = 1;
            }
            // Otherwise stay at page 1
            else {
                newPage = 1;
            }

            // Update URL with the new page number
            updateUrlWithPage(newPage);
            return newPage;
        });
    };

    const handleNextPage = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        if (!maxPage) return;

        setAnimationDirection("left");
        setCurrPage(prev => {
            let newPage;
            // If we're at the second-to-last page of an odd-numbered total, move to the last page
            if (maxPage % 2 === 1 && prev === maxPage - 1) {
                newPage = maxPage;
            }
            // If we can flip 2 pages forward without exceeding total pages
            else if (prev + 2 <= maxPage) {
                newPage = prev + 2;
            }
            // If we're one page away from the end, go to the last page
            else if (prev + 1 <= maxPage) {
                newPage = maxPage;
            }
            // Otherwise stay at the current page
            else {
                newPage = prev;
            }

            // Update URL with the new page number
            updateUrlWithPage(newPage);
            return newPage;
        });
    };

    if (!maxPage) return null;

    return <div ref={flipbookContainerRef} className="flex justify-between items-center flex-wrap mx-auto">
        <div
            ref={flipbookRef}
            className={`overflow-hidden mx-auto my-4 h-[90vh] aspect-[28/19] flex justify-center`}
            style={{cursor: isPanning ? 'grabbing' : (zoomLevel > 1.0 ? 'grab' : 'default')}}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <button disabled={currPage <= 1} onClick={(e) => {
                handlePreviousPage(e)
            }}
                    className={`${currPage <= 1 ? "text-gray-400 opacity-40" : "text-white"} absolute left-12 top-1/2 -translate-y-1/2`}>
                <ChevronLeft size="5rem"/></button>

            {/* Page turn indicators */}
            {isDragging && (
                <>
                    {/* Previous page indicator (right side) */}
                    <div
                        className="absolute top-0 left-0 h-full flex items-center justify-start pointer-events-none"
                        style={{
                            opacity: Math.max(0, dragProgress),
                            transition: 'opacity 0.1s ease-out'
                        }}
                    >
                        <div className="bg-white bg-opacity-30 p-4 rounded-r-lg">
                            <ChevronLeft size="3rem" className="text-white"/>
                        </div>
                    </div>

                    {/* Next page indicator (left side) */}
                    <div
                        className="absolute top-0 right-0 h-full flex items-center justify-end pointer-events-none"
                        style={{
                            opacity: Math.max(0, -dragProgress),
                            transition: 'opacity 0.1s ease-out'
                        }}
                    >
                        <div className="bg-white bg-opacity-30 p-4 rounded-l-lg">
                            <ChevronRight size="3rem" className="text-white"/>
                        </div>
                    </div>
                </>
            )}

            <div
                className="relative flex h-full"
                style={{
                    transform: zoomLevel > 1.0 ? `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)` : 'none',
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.2s ease-out'
                }}
            >
                <animated.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        zIndex: 3,
                        position: "absolute",
                        background: to(
                            [gradientSpring.rotation, gradientSpring.g1, gradientSpring.g2, gradientSpring.g3],
                            (rotation, g1, g2, g3) => `linear-gradient(${rotation}deg,rgba(2, 0, 36, 0) ${g1}%, rgba(255,255,255, 1) ${g2}%, rgba(0, 212, 255, 0) ${g3}%)`
                        )
                    }}
                    {...({} as HTMLAttributes<HTMLDivElement>)}
                />
                {Array.from({length: maxPage}).map((_, index) => {
                    return (
                        <Page
                            flipBookWidth={flipbookWidth}
                            flipBookHeight={flipbookHeight}
                            currentPage={currPage}
                            overlaysToDelete={overlaysToDelete}
                            activeOverlayId={activeOverlayId}
                            setOverlaysToDelete={setOverlaysToDelete}
                            formOverlays={formOverlays} setOverlays={setOverlaysToRender}
                            setFormOverlays={setFormOverlays}
                            setActiveOverlayId={setActiveOverlayId} overlays={overlays}
                            maxPage={maxPage}
                            key={index} thisPage={index + 1}
                            pdfUrl={pdfUrl} shouldRender={renderedPages.has(index)}
                            zoomLevel={zoomLevel}/>
                    );
                })}
            </div>
            <button disabled={currPage >= maxPage} onClick={(e) => {
                handleNextPage(e)
            }}
                    className={`${currPage >= maxPage ? "text-gray-400 opacity-40" : "text-white"} absolute right-12 top-1/2 -translate-y-1/2`}>
                <ChevronRight size="5rem"/></button>
        </div>
        <div className="w-full">
            <Toolbar
                setPage={setCurrPage}
                setZoomLevel={setZoomLevel}
                currentPage={currPage}
                totalPages={maxPage}
                handleNextPage={handleNextPage}
                handlePreviousPage={handlePreviousPage}
                currentZoom={zoomLevel}
                isFullScreen={isFullScreen}
                toggleFullScreen={toggleFullScreen}
            />
        </div>

    </div>

}
