"use server"

export async function getPdfPageCount(pdfId: string) {
    if (!process.env.BACKEND_URL) {
        throw new Error("Backend URL is not defined");
    }

    try {
        const res = await fetch(`${process.env.BACKEND_URL}/pdf/count/${pdfId}`, {
            method: "GET",
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) {
            // Fallback: If the endpoint doesn't exist yet or fails, return null
            // so the frontend can fallback to loading the PDF
            return null;
        }

        const data = await res.json();
        return data.count as number;
    } catch (error) {
        console.error("Error fetching PDF page count:", error);
        return null;
    }
}
