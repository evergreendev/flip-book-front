"use server"

export async function handleUpload(prevState: { error?: string | null, redirect?: boolean | null }, formData: FormData) {
    if (!process.env.BACKEND_URL) return {...prevState, error: "Something went wrong. Please try again."};

    const res = await fetch(process.env.BACKEND_URL + "/pdf/upload", {
        method: "POST",
        body: formData,
    });
    if (res.status !== 200) return {...prevState, error: "Invalid Credentials. Please Try again"};

    return {error: null, redirect: true}
}
