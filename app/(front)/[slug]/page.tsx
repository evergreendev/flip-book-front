import {cookies} from "next/headers";
import {FlipBook} from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/columns";

import {Metadata} from "next";
import {Overlay} from "@/app/common/Flipbooks/types";
import Flipbook from "@/app/common/Flipbooks/components/Flipbook";

//todo move this somewhere better

async function getData(id: string): Promise<FlipBook | null> {
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token');
    const flipbookRes = await fetch(`${process.env.BACKEND_URL}/flipbooks/slug/${id}`, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userToken?.value}`
        }
    });
    if (!flipbookRes.ok) return null;
    return await flipbookRes.json()
}

async function getOverlays(id: string): Promise<Overlay[] | null> {

    const overlaysRes = await fetch(`${process.env.BACKEND_URL}/flipbooks/overlays/${id}`);

    if (!overlaysRes.ok) return null;

    return await overlaysRes.json();
}

type Args = {
    params: Promise<{
        slug: string
    }>
}

export async function generateMetadata({params: paramsPromise}: Args): Promise<Metadata> {
    const {slug} = await paramsPromise;
    const data = await getData(slug);

    return {
        title: data?.title || 'Flipbook'
    };
}

export default async function Page({params: paramsPromise}: Args) {
    const {slug} = await paramsPromise
    const data = await getData(slug);
    const overlays = await getOverlays(data?.id||"");

    if (!data) return null;

    return (
        <div
            className="mx-auto h-screen p-3 bg-gradient-to-b from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800">
        <Flipbook pdfUrl={process.env.PDF_URL + "/" + data.pdf_path} initialOverlays={overlays}/>
        </div>
    )
}
