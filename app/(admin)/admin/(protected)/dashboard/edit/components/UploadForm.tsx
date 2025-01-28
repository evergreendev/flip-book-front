"use client"

import {handleUpload} from "../actions/upload";
import {useActionState} from "react";

const UploadForm = () => {
    const [state, formAction] = useActionState(handleUpload, {error:null,redirect:false});

    return <form action={formAction}>
        {
            state.error && <div className="text-red-900 bg-red-100 p-4">{state.error}</div>
        }
        <div className="flex gap-2 m-2">
            <label htmlFor="file">PDF:</label>
            <input name="file" type="file"/>
        </div>

        <button>Submit</button>
    </form>
}

export default UploadForm;
