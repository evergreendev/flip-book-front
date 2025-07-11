import {headers} from "next/headers";
import {FlipBook} from "@/app/types";
import FlipBookMultiView from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/FlipBookMultiView";
import Header from "@/app/(admin)/admin/(protected)/components/Header";

async function getData(): Promise<FlipBook[]> {
    const flipbookRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/flipbooks/?showDrafts=true`, {
        credentials: 'include',
        headers: await headers()
    });

    if (!flipbookRes.ok) return [];

    const data = await flipbookRes.json();

    return (data as FlipBook[]).map((row) => {
        return {
            ...row,
            title: row.title || "Unnamed Flipbook"
        }
    });
}

export default async function DemoPage() {
    const data = await getData()

    return (
        <>
            <Header/>
            <div className="container mx-auto py-10">
                <FlipBookMultiView flipBooks={data}/>
            </div>
        </>
    )
}
