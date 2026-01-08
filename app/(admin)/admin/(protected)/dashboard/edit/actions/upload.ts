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
        },
        // @ts-expect-error duplex is missing on the type
        duplex: 'half'
    });

    if (res.status !== 202 && res.status !== 200 && res.status !== 201) return {...loadingState, error: "Invalid Credentials or Upload failed. Please Try again", redirect: null, isLoading: false};

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
    if (flipbookRes.status !== 201 && flipbookRes.status !== 200) return {...loadingState, error: "Something went wrong while creating flipbook. Please Try again", redirect: null, isLoading: false};
    const flipbookBody = await flipbookRes.json();

    return {error: null, redirect: "edit/"+flipbookBody.flipbook.id, isLoading: false}
}
