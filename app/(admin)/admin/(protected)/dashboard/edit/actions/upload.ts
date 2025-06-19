"use server"

import {checkOrRefreshToken} from "@/app/common/Auth/actions";

export async function handleUpload(prevState: { error: string | null, redirect: string | null, isLoading: boolean }, formData: FormData) {
    // Set loading state to true at the beginning
    const loadingState = { ...prevState, isLoading: true };
    const file = formData.get("file");

    if (!process.env.BACKEND_URL) return {...loadingState, error: "Something went wrong. Please try again.", redirect: null, isLoading: false};

    const userToken = await checkOrRefreshToken();

    const res = await fetch(process.env.BACKEND_URL + "/pdf/upload", {
        method: "POST",
        body: formData,
        headers: {
            "Authorization": `Bearer ${userToken?.value}`
        }
    });

    if (res.status !== 202) return {...loadingState, error: "Invalid Credentials. Please Try again", redirect: null, isLoading: false};

    const pdf = await res.json();

    const flipbookRes = await fetch(process.env.BACKEND_URL + "/flipbooks", {
        method: "POST",
        body: JSON.stringify({
            pdfPath: pdf.jobId,
            title: (file as File).name.replace(/\.pdf$/, ''),
            status: "draft",
        }),
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userToken?.value}`
        }
    });
    if (res.status !== 202) return {...loadingState, error: "Invalid Credentials. Please Try again", redirect: null, isLoading: false};
    const flipbookBody = await flipbookRes.json();

    return {error: null, redirect: "edit/"+flipbookBody.flipbook.id, isLoading: false}
}
