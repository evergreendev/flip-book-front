"use server"

import {cookies} from "next/headers";

export async function handleUpload(prevState: { error?: string | null, redirect?: boolean | null }, formData: FormData) {
    if (!process.env.BACKEND_URL) return {...prevState, error: "Something went wrong. Please try again."};

    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token');

    const res = await fetch(process.env.BACKEND_URL + "/pdf/upload", {
        method: "POST",
        body: formData,
        headers: {
            "Authorization": `Bearer ${userToken?.value}`
        }
    });
    if (res.status === 401) {
        cookieStore.delete('user_token');
    }
    if (res.status !== 200) return {...prevState, error: "Invalid Credentials. Please Try again"};

    return {error: null, redirect: true}
}
