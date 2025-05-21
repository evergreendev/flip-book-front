"use client"

import {handleUpload} from "../actions/upload";
import {RefObject, useActionState, useMemo, useRef} from "react";
import {useDropzone} from "react-dropzone";
import {Property} from "csstype";
import FlexDirection = Property.FlexDirection;
import {useRouter} from "next/navigation";

const baseStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as FlexDirection,
    alignItems: 'center',
    padding: '20px',
    borderWidth: 2,
    borderRadius: 2,
    borderColor: '#eeeeee',
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
    color: '#bdbdbd',
    outline: 'none',
    transition: 'border .24s ease-in-out'
};

const focusedStyle = {
    borderColor: '#2196f3'
};

const acceptStyle = {
    borderColor: '#00e676'
};

const rejectStyle = {
    borderColor: '#ff1744'
};

function Dropzone(props: { required: boolean, name: string }) {
    const {required, name} = props;

    const hiddenInputRef: RefObject<HTMLInputElement | null> = useRef(null);

    const {
        isFocused,
        isDragAccept,
        isDragReject, getRootProps, getInputProps, acceptedFiles
    } = useDropzone({
        onDrop: (incomingFiles) => {
            if (hiddenInputRef.current) {
                const dataTransfer = new DataTransfer();
                incomingFiles.forEach((v) => {
                    dataTransfer.items.add(v);
                });
                hiddenInputRef.current.files = dataTransfer.files;
            }
        },
        accept: {
            'application/pdf':[".pdf"]
        },
        maxFiles: 2
    });

    const files = acceptedFiles.map(file => (
        <li key={file.path}>
            {file.path} - {file.size} bytes
        </li>
    ));

    const style = useMemo(() => ({
        ...baseStyle,
        ...(isFocused ? focusedStyle : {}),
        ...(isDragAccept ? acceptStyle : {}),
        ...(isDragReject ? rejectStyle : {})
    }), [
        isFocused,
        isDragAccept,
        isDragReject
    ]);

    return (
        <div className="container">
            <div {...getRootProps({style})}>
                {/*
          Add a hidden file input
          Best to use opacity 0, so that the required validation message will appear on form submission
        */}
                <input type="file" name={name} required={required} style={{opacity: 0}} ref={hiddenInputRef}/>
                <input {...getInputProps()} />
                <p>Drop PDF here</p>
            </div>
            <aside>
                <h4>Files</h4>
                <ul>{files}</ul>
            </aside>
        </div>
    );
}

type UploadFormState = {
    error: string | null,
    redirect: string | null,
    isLoading: boolean
}
const initialState:UploadFormState = {
    error: null,
    redirect: null,
    isLoading: false
}

const UploadForm = () => {
    const router = useRouter();
    const [state, formAction] = useActionState(handleUpload, initialState);

    if (state.redirect) {
        router.push(state.redirect);
    }

    return <div className="flex items-center justify-center min-h-screen p-4 relative">
        {state.isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-lg font-semibold">Uploading...</p>
                    <p className="text-sm text-gray-600 mt-2">Please wait while your file is being processed.</p>
                </div>
            </div>
        )}
        <form action={formAction}>
            {
                state.error && <div className="text-red-900 bg-red-100 p-4">{state.error}</div>
            }
            <div className="flex gap-2 m-2">
                <Dropzone required={true} name="file"/>
            </div>

            <button 
                className={`bg-white text-black rounded px-4 mx-auto block ${state.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={state.isLoading}
            >
                {state.isLoading ? 'Uploading...' : 'Submit'}
            </button>
        </form>
    </div>
}

export default UploadForm;
