"use server"

export async function getPdfStatus(pdfId: string) {
    if (!process.env.BACKEND_URL) {
        throw new Error("Backend URL is not defined");
    }

    const res = await fetch(`${process.env.BACKEND_URL}/pdf/status/${pdfId}`, {
        method: "GET",
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error("Failed to fetch PDF status");
    }

    return res.json();
}
