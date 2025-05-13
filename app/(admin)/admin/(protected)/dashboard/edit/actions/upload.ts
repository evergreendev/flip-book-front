"use server"

import {checkOrRefreshToken} from "@/app/common/Auth/actions";

export async function handleUpload(prevState: { error: string | null, redirect: string | null }, formData: FormData) {
    if (!process.env.BACKEND_URL) return {...prevState, error: "Something went wrong. Please try again.", redirect: null};

    const userToken = await checkOrRefreshToken();

    const res = await fetch(process.env.BACKEND_URL + "/pdf/upload", {
        method: "POST",
        body: formData,
        headers: {
            "Authorization": `Bearer ${userToken?.value}`
        }
    });

    if (res.status !== 200) return {...prevState, error: "Invalid Credentials. Please Try again", redirect: null};

    const pdf = await res.json();

    const flipbookRes = await fetch(process.env.BACKEND_URL + "/flipbooks", {
        method: "POST",
        body: JSON.stringify({
            pdfPath: pdf.filePath,
            status: "draft",
        }),
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userToken}`
        }
    });
    if (res.status !== 200) return {...prevState, error: "Invalid Credentials. Please Try again", redirect: null};
    const flipbookBody = await flipbookRes.json();

    return {error: null, redirect: "edit/"+flipbookBody.flipbook.id}
}
