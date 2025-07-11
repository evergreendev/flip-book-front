"use client"

import {useActionState, useContext, useEffect, useRef, useState} from "react";
import {handleEdit} from "@/app/(admin)/admin/(protected)/dashboard/edit/actions/edit";
import {getPdfStatus} from "@/app/(admin)/admin/(protected)/dashboard/edit/actions/getPdfStatus";
import Flipbook from "@/app/common/Flipbooks/components/Flipbook";
import {Check, Loader2, LockKeyhole, LockKeyholeOpen} from "lucide-react"
import slugify from "slugify";
import {useRouter} from "next/navigation";
import editorContext from "../context/EditorContext";
import Link from "next/link";
import {Overlay} from "@/app/common/Flipbooks/types";
import {FlipBook} from "@/app/types";

interface NotificationProps {
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
    onClose: () => void;
}

const Notification = ({message, type, isVisible, onClose}: NotificationProps) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
            <div className={`
        flex items-center gap-2 rounded-lg shadow-lg p-4 pl-3 pr-6
        ${type === 'success' ? 'bg-green-100 border-l-4 border-green-500' : 'bg-red-100 border-l-4 border-red-500'}
      `}>
                <div className={`
          rounded-full p-1
          ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
        `}>
                    <Check size={16}/>
                </div>
                <p className={`text-sm font-medium ${type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {message}
                </p>
            </div>
        </div>
    );
};

const OverlayForm = ({
                         hideForm,
                         setOverlays,
                         overlays,
                         overlaysToUpdate,
                         setOverlaysToUpdate,
                     }: {
    setOverlays: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void,
    overlays: Overlay[] | null,
    overlaysToUpdate: Overlay[] | null,
    hideForm: boolean,
    setOverlaysToUpdate: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void,
}) => {
    const editorInfo = useContext(editorContext);

    if (hideForm) {
        let hasUpdatedFlag = false;
        const updatedOverlays = overlaysToUpdate ? overlaysToUpdate.map(overlay => {
            const url = overlay.url || '';
            const validatedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
            if (url !== validatedUrl) hasUpdatedFlag = true;
            return {...overlay, url: validatedUrl}
        }) : null;

        if (hasUpdatedFlag) {
            setOverlaysToUpdate(updatedOverlays);
        }
    }

    if (!editorInfo || !editorInfo.activeOverlay) return null;
    const activeOverlayId = editorInfo.activeOverlay.id;
    if (!activeOverlayId || !overlays || hideForm) return null;
    const activeOverlay = overlays.find(overlay => overlay.id === activeOverlayId);
    if (!activeOverlay) return null;
    const activeOverlayCanvas = editorInfo.activeOverlayPageCanvas;
    if (!activeOverlayCanvas) return null;


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!overlays) return;

        const overlayToUpdate = overlays.find(overlay => overlay.id === activeOverlayId);

        if (!overlayToUpdate) return;

        setOverlays(overlays.map(overlay => {
            if (overlay.id === activeOverlayId) {
                return {...overlay, url: e.currentTarget.value}
            }
            return overlay
        }));

        if (overlaysToUpdate) {
            const existingOverlayToUpdate = overlaysToUpdate.find(overlay => overlay.id === activeOverlayId);
            setOverlaysToUpdate(existingOverlayToUpdate ? overlaysToUpdate.map(overlay => {
                if (overlay.id === activeOverlayId) {
                    return {...overlay, url: e.currentTarget.value}
                }
                return overlay
            }) : overlaysToUpdate.concat([{...overlayToUpdate, url: e.currentTarget.value}]))

            return;
        }

        setOverlaysToUpdate([{...overlayToUpdate, url: e.currentTarget.value}]);
    };

    const handleBlur = () => {
        if (!overlays) return;

        const overlayToUpdate = overlays.find(overlay => overlay.id === activeOverlayId);

        if (!overlayToUpdate) return;

        const url = overlayToUpdate.url || '';
        const validatedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

        setOverlays(overlays.map(overlay => {
            if (overlay.id === activeOverlayId) {
                return {...overlay, url: validatedUrl}
            }
            return overlay
        }));

        if (overlaysToUpdate) {
            const existingOverlayToUpdate = overlaysToUpdate.find(overlay => overlay.id === activeOverlayId);
            setOverlaysToUpdate(existingOverlayToUpdate ? overlaysToUpdate.map(overlay => {
                if (overlay.id === activeOverlayId) {
                    return {...overlay, url: validatedUrl}
                }
                return overlay
            }) : overlaysToUpdate.concat([{...overlayToUpdate, url: validatedUrl}]))

            return;
        }

        setOverlaysToUpdate([{...overlayToUpdate, url: validatedUrl}]);
    }

    return (
        <div className="fixed top-12 left-8 z-50 bg-white w-full max-w-screen-sm p-10 rounded shadow-lg">
            <label htmlFor="url">Link to a specific webpage:</label>
            <input
                type="text"
                id="url"
                name="url"
                value={activeOverlay.url || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="https://egmrc.com"
                className="bg-slate-100 w-full border-b-slate-200 border-b p-2"
            />
        </div>
    );
}

const EditForm = ({flipBook, pdfPath, pdfId, initialOverlays}: {
    flipBook: FlipBook,
    pdfPath: string,
    pdfId: string,
    initialOverlays: Overlay[] | null
}) => {
    const router = useRouter();
    const [activeOverlayPageCanvas, setActiveOverlayPageCanvas] = useState<HTMLCanvasElement | null>(null);
    const {id, title, status, path_name} = flipBook;
    const [state, formAction] = useActionState(handleEdit, {error: null, redirect: "", flipBookId: id});
    const [currPath, setCurrPath] = useState(path_name || "");
    const [currTitle, setCurrTitle] = useState(title || "untitled flipbook");
    const [canEditPath, setCanEditPath] = useState(false);
    const [pathHasBeenEdited, setPathHasBeenEdited] = useState(false);
    const [overlaysToUpdate, setOverlaysToUpdate] = useState<Overlay[] | null>(null);
    const [overLaysToDelete, setOverLaysToDelete] = useState<string[]>([]);
    const [overlaysToRender, setOverlaysToRender] = useState<Overlay[] | null>(initialOverlays);
    const [activeOverlay, setActiveOverlay] = useState<Overlay | null>(null);
    const [flipBookContainer, setFlipbookContainer] = useState<HTMLDivElement | null>(null);
    const [shouldGenerateOverlays, setShouldGenerateOverlays] = useState(false);
    const [isGeneratingConfirmation, setIsGeneratingConfirmation] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverRenderJobIsFinished, setServerRenderJobIsFinished] = useState(false);
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error';
        isVisible: boolean;
    }>({
        message: '',
        type: 'success',
        isVisible: false
    });

    const formRef = useRef<HTMLFormElement>(null);
    const draftFieldRef = useRef<HTMLInputElement>(null);

    const statusStyles = {
        draft: "bg-gray-100",
        published: "bg-green-200",
        private: "bg-red-100"
    }
    useEffect(() => {
        if (serverRenderJobIsFinished) return;

        const checkJob = async () => {
            try {
                const data = await getPdfStatus(pdfId);
                console.log(data);
                if (data.status === "done") {
                    setServerRenderJobIsFinished(true);
                }
            } catch (error) {
                console.error("Error checking PDF status:", error);
            }
        }
        const interval = setInterval(() => {
            checkJob();
        }, 1000);

        return () => clearInterval(interval);
    }, [pdfId, serverRenderJobIsFinished]);

    useEffect(() => {
        if (draftFieldRef.current) {
            draftFieldRef.current.value = title || "untitled flipbook"
        }
    }, [draftFieldRef, title]);

    useEffect(() => {
        if (state.redirect) {
            console.log(state.redirect);
            // Show success notification
            const wasDraft = draftFieldRef.current?.checked;
            setNotification({
                message: wasDraft
                    ? 'Successfully saved as draft'
                    : 'Successfully published',
                type: 'success',
                isVisible: true
            });
            // Refresh after a short delay to let the notification be seen
            setTimeout(() => {
                router.refresh();
            }, 500);
        }
    }, [router, state]);

    useEffect(() => {
        if (title) {
            setCurrPath((prev) => prev === "" ? slugify(title) : prev);
            setPathHasBeenEdited(true);
        }
    }, [title]);


    function handleSubmit(e: React.MouseEvent<HTMLButtonElement>, isDraft: boolean) {
        e.preventDefault();
        setIsSubmitting(true);

        if (draftFieldRef.current) {
            draftFieldRef.current.checked = isDraft;
        }

        if (formRef.current) {
            formRef.current.requestSubmit();
        }
        if (!state.error) {
            setOverLaysToDelete([]);
            setOverlaysToUpdate(null);
        }
    }

    useEffect(() => {
        if (state.redirect || state.error) {
            setIsSubmitting(false);

            if (state.error) {
                setNotification({
                    message: state.error,
                    type: 'error',
                    isVisible: true
                });
            }

            if (state.error) {
                setNotification({
                    message: state.error,
                    type: 'error',
                    isVisible: true
                });
            }
        }
    }, [state]);


    function handleUpdateTitle(e: { currentTarget: { value: string; }; }) {
        setCurrTitle(e.currentTarget.value);

        if (!path_name && !pathHasBeenEdited) {
            setCurrPath(slugify(e.currentTarget.value, {lower: true}));
        }
    }

    function handleUpdatePath(e: { currentTarget: { value: string; }; }) {
        if (!canEditPath) return;

        setCurrPath(e.currentTarget.value.toLowerCase());
        setPathHasBeenEdited(true);
    }

    function handlePathLock(e: { preventDefault: () => void; }) {
        e.preventDefault();

        setCanEditPath(!canEditPath);
    }

    function handleResetSlug(e: { preventDefault: () => void; }) {
        e.preventDefault();

        setPathHasBeenEdited(false);

        setCurrPath(path_name || slugify(currTitle, {lower: true}));
    }

    function handleGenerate(e: { preventDefault: () => void; }) {
        e.preventDefault();

        setIsGeneratingConfirmation(true);
    }

    function confirmGenerate(e: { preventDefault: () => void; }) {
        e.preventDefault();

        setShouldGenerateOverlays(true);
        setIsGeneratingConfirmation(false);
    }

    function cancelGenerate(e: { preventDefault: () => void; }) {
        e.preventDefault();

        setIsGeneratingConfirmation(false);
    }

    if (!serverRenderJobIsFinished) return <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-4 rounded-md flex items-center gap-2">
            <Loader2 className="animate-spin h-6 w-6"/>
            <span>Rendering Pages</span>
        </div>
    </div>

    return <div className="flex items-center justify-center min-h-screen p-4 w-full">
        {isSubmitting || shouldGenerateOverlays && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-4 rounded-md flex items-center gap-2">
                    <Loader2 className="animate-spin h-6 w-6"/>
                    <span>{shouldGenerateOverlays ? "Generating Ad Links" : "Saving changes..."}</span>
                </div>
            </div>
        )}

        <Notification
            message={notification.message}
            type={notification.type}
            isVisible={notification.isVisible}
            onClose={() => setNotification(prev => ({...prev, isVisible: false}))}
        />

        <editorContext.Provider value={{
            setActiveOverlayPageCanvas: setActiveOverlayPageCanvas,
            activeOverlayPageCanvas: activeOverlayPageCanvas,
            status: status,
            mode: "edit",
            flipBookId: id,
            flipbookContainer: flipBookContainer,
            setFlipbookContainer: setFlipbookContainer,
            activeOverlay: activeOverlay,
            setActiveOverlay: setActiveOverlay
        }}>
            <div className="w-full">
                <form onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                    }
                }}

                      ref={formRef} action={formAction} className="w-full">
                    {
                        state.error && <div className="text-red-900 bg-red-100 p-4">{state.error}</div>
                    }
                    <div>
                        <label htmlFor="title">Title</label>
                        <input value={currTitle} onChange={handleUpdateTitle} type="text" name="title"
                               className="bg-slate-100 w-full border-b-slate-200 border-b p-2 text-2xl"/>
                    </div>
                    <div className="my-2">
                        <label htmlFor="embed-url">Flipbook Slug</label>
                        <div className="flex items-center">
                            <button onClick={handlePathLock}
                                    className={`mr-2 ${canEditPath ? "bg-blue-200" : "bg-blue-200"} p-1 rounded-full`}>
                                {
                                    canEditPath ? <LockKeyholeOpen/> : <LockKeyhole/>
                                }
                            </button>
                            <input onChange={handleUpdatePath} value={currPath} type="text" name="path"
                                   className={`${canEditPath ? "bg-slate-100" : "bg-slate-50 pointer-events-none"} w-full border-b-slate-200 border-b p-2 text-2xl`}/>
                            {
                                pathHasBeenEdited &&
                                <button onClick={handleResetSlug} className="bg-blue-200 w-24 self-stretch">Reset
                                    Slug</button>
                            }
                        </div>
                    </div>
                    <input readOnly className="hidden" aria-hidden={true} name="overlays"
                           value={JSON.stringify(overlaysToUpdate || [])}/>
                    <input readOnly className="hidden" aria-hidden={true} name="overlaysToDelete"
                           value={overLaysToDelete || []}/>
                    <OverlayForm hideForm={!activeOverlay} overlaysToUpdate={overlaysToUpdate}
                                 overlays={overlaysToRender} setOverlays={setOverlaysToRender}
                                 setOverlaysToUpdate={setOverlaysToUpdate}/>

                    <input ref={draftFieldRef} aria-hidden={true} className="hidden" type="checkbox" name="isDraft"/>
                    <div className="bg-slate-300 p-4">
                        <div className="flex justify-end gap-2 items-center">
                            <div className="flex mx-auto">
                                <button onClick={(e) => {
                                    handleGenerate(e)
                                }}
                                        className={`bg-green-700 hover:bg-green-500 transition-colors p-1 rounded ${isGeneratingConfirmation ? "rounded-r-none" : ""} px-4 text-white block`}>
                                    Generate Ad Links from Text
                                </button>
                                <button onClick={confirmGenerate} className={`${isGeneratingConfirmation ? "w-24" : "w-0 p-0"} duration-500 overflow-x-hidden bg-green-600 hover:bg-green-500 text-white transition-colors`}>
                                    Confirm
                                </button>
                                <button onClick={cancelGenerate} className={`${isGeneratingConfirmation ? "w-24 p-1":"w-0 p-0"} duration-500 overflow-x-hidden bg-gray-200 hover:bg-gray-100 transition-all`}>
                                    Cancel
                                </button>
                            </div>
                            {
                                status === "published" &&
                                <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}/${currPath}`} target="_blank"
                                      className={`my-2 mx-4 px-4 rounded bg-slate-700 text-white`}>
                                    View Flipbook
                                </Link>
                            }
                            <button type="submit" onClick={(e) => handleSubmit(e, true)}
                                    className="bg-gray-100 my-2 text-black rounded px-4 block">Save Draft
                            </button>
                            <button type="submit" onClick={(e) => handleSubmit(e, false)}
                                    className="bg-green-700 text-white rounded px-4 block">Publish
                            </button>
                        </div>
                        <div className="flex justify-end">
                            <p className="flex items-center"><strong>Status:</strong>
                                <div className={`ml-4 mr-1 size-2 rounded-full ${statusStyles[status]}`}/>
                                {status}</p>
                        </div>
                    </div>
                </form>
                <Flipbook setShouldGenerateOverlays={setShouldGenerateOverlays}
                          shouldGenerateOverlays={shouldGenerateOverlays} setOverlaysToRender={setOverlaysToRender}
                          overlaysToDelete={overLaysToDelete}
                          setOverlaysToDelete={setOverLaysToDelete}
                          formOverlays={overlaysToUpdate} pdfId={pdfId} pdfPath={pdfPath}
                          initialOverlays={overlaysToRender}
                          setFormOverlays={setOverlaysToUpdate}
                />
            </div>
        </editorContext.Provider>
    </div>
}

export default EditForm;
