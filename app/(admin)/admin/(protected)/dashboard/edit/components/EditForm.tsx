"use client"

import {useActionState, useEffect, useRef, useState} from "react";
import {handleEdit} from "@/app/(admin)/admin/(protected)/dashboard/edit/actions/edit";
import Flipbook, {Overlay} from "@/app/common/Flipbooks/components/Flipbook";
import {FlipBook} from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/columns";
import {LockKeyhole, LockKeyholeOpen} from "lucide-react"
import slugify from "slugify";
import {useRouter} from "next/navigation";
import ModeContext from "../context/ModeContext";

const OverlayForm = ({activeOverlayId, setOverlays, overlays, overlaysToUpdate, setOverlaysToUpdate}: {
    activeOverlayId: string | null,
    setOverlays: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void,
    overlays: Overlay[] | null,
    overlaysToUpdate: Overlay[] | null,
    setOverlaysToUpdate: (value: (((prevState: (Overlay[] | null)) => (Overlay[] | null)) | Overlay[] | null)) => void
}) => {
    if (!activeOverlayId || !overlays) return null;
    const activeOverlay = overlays.find(overlay => overlay.id === activeOverlayId);
    if (!activeOverlay) return null;


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

        if (overlaysToUpdate){
            const existingOverlayToUpdate = overlaysToUpdate.find(overlay => overlay.id === activeOverlayId);
            setOverlaysToUpdate(existingOverlayToUpdate ? overlaysToUpdate.map(overlay => {
                if (overlay.id === activeOverlayId) {
                    return {...overlay, url: e.currentTarget.value}
                }
                return overlay
            }): overlaysToUpdate.concat([{...overlayToUpdate, url: e.currentTarget.value}]))

            return;
        }

        setOverlaysToUpdate([{...overlayToUpdate, url: e.currentTarget.value}]);
    };

    return (
        <div>
            <label htmlFor="url">URL:</label>
            <input
                type="text"
                id="url"
                name="url"
                value={activeOverlay.url || ''}
                onChange={handleChange}
                className="bg-slate-100 w-full border-b-slate-200 border-b p-2"
            />
        </div>
    );
}

const EditForm = ({flipBook, pdfPath, initialOverlays}: {
    flipBook: FlipBook,
    pdfPath: string,
    initialOverlays: Overlay[] | null
}) => {
    const router = useRouter();
    const {id, title, status, path_name} = flipBook;
    const [state, formAction] = useActionState(handleEdit, {error: null, redirect: "", flipBookId: id});
    const [currPath, setCurrPath] = useState(path_name || "");
    const [currTitle, setCurrTitle] = useState(title || "untitled flipbook");
    const [canEditPath, setCanEditPath] = useState(false);
    const [pathHasBeenEdited, setPathHasBeenEdited] = useState(false);
    const [overlaysToUpdate, setOverlaysToUpdate] = useState<Overlay[] | null>(null);
    const [overlaysToRender, setOverlaysToRender] = useState<Overlay[] | null>(initialOverlays);
    const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);

    const formRef = useRef<HTMLFormElement>(null);
    const draftFieldRef = useRef<HTMLInputElement>(null);

    const statusStyles = {
        draft: "bg-gray-100",
        published: "bg-green-200",
        private: "bg-red-100"
    }

    useEffect(() => {
        if (draftFieldRef.current) {
            draftFieldRef.current.value = title || "untitled flipbook"
        }
    }, [draftFieldRef, title]);

    useEffect(() => {
        console.log(state);
        if (state.redirect) {
            console.log(state.redirect);
            //this will reload the page without doing SSR
            router.refresh();
        }
    }, [router, state]);


    function handleSubmit(e: React.MouseEvent<HTMLButtonElement>, isDraft: boolean) {
        e.preventDefault();

        if (draftFieldRef.current) {
            draftFieldRef.current.checked = isDraft;
        }

        if (formRef.current) {
            formRef.current.requestSubmit();
        }
    }

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

    return <div className="flex items-center justify-center min-h-screen p-4 w-full">
        <form ref={formRef} action={formAction} className="w-full">
            {
                state.error && <div className="text-red-900 bg-red-100 p-4">{state.error}</div>
            }
            <div className="flex justify-end gap-2 items-center">
                <button type="submit" onClick={(e) => handleSubmit(e, true)}
                        className="bg-gray-100 my-2 text-black rounded px-4 block">Save Draft
                </button>
                <button type="submit" onClick={(e) => handleSubmit(e, false)}
                        className="bg-green-700 text-white rounded px-4 block">Publish
                </button>
            </div>
            <div className="flex justify-end">
                <p className={`my-2 py-1 px-8 rounded-full ${statusStyles[status]}`}>{status}</p>
            </div>
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
                        <button onClick={handleResetSlug} className="bg-blue-200 w-24 self-stretch">Reset Slug</button>
                    }
                </div>
            </div>
            <input readOnly className="hidden" aria-hidden={true} name="overlays" value={JSON.stringify(overlaysToUpdate)}/>
            <OverlayForm overlaysToUpdate={overlaysToUpdate} overlays={overlaysToRender} setOverlays={setOverlaysToRender} activeOverlayId={activeOverlayId}
                         setOverlaysToUpdate={setOverlaysToUpdate}/>
            <ModeContext.Provider value={{status: status, mode: "edit", flipBookId: id}}>
                <Flipbook formOverlays={overlaysToUpdate} pdfUrl={pdfPath} initialOverlays={overlaysToRender} setFormOverlays={setOverlaysToUpdate}
                          setActiveOverlayId={setActiveOverlayId}/>
            </ModeContext.Provider>


            <input ref={draftFieldRef} aria-hidden={true} className="hidden" type="checkbox" name="isDraft"/>


            <div className="flex justify-end gap-2 items-center">
                <button type="submit" onClick={(e) => handleSubmit(e, true)}
                        className="bg-gray-100 my-2 text-black rounded px-4 block">Save Draft
                </button>
                <button type="submit" onClick={(e) => handleSubmit(e, false)}
                        className="bg-green-700 text-white rounded px-4 block">Publish
                </button>
            </div>
        </form>
    </div>
}

export default EditForm;
