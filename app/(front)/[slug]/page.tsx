import {FlipBook} from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/columns";

import {Metadata} from "next";
import {Overlay} from "@/app/common/Flipbooks/types";
import Flipbook from "@/app/common/Flipbooks/components/Flipbook";
import {ScreenSizeProvider} from "@/app/common/Flipbooks/hooks/useScreenSize";

//todo move this somewhere better

async function getData(id: string): Promise<FlipBook | null> {
    const flipbookRes = await fetch(`${process.env.BACKEND_URL}/flipbooks/slug/${id}`, {
        headers: {
            "Content-Type": "application/json",
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
    const overlays = await getOverlays(data?.id || "");

    if (!data) return null;

    return (
        <div
            className="mx-auto h-[100svh]  flex flex-col sm:block justify-center bg-gradient-to-b from-neutral-900 to-neutral-800">
            <ScreenSizeProvider>
                {data.pdf_path && <Flipbook pdfId={data.pdf_path} pdfPath={process.env.PDF_URL + "/" + data.pdf_path}
                                            initialOverlays={overlays}/>
                }            </ScreenSizeProvider>
        </div>
    )
}
