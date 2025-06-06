import {FlipBook} from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/columns";
import EditForm from "@/app/(admin)/admin/(protected)/dashboard/edit/components/EditForm";
import {Overlay} from "@/app/common/Flipbooks/types";
import {headers} from "next/headers";

async function getData(id:string): Promise<FlipBook|null> {
    const flipbookRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/flipbooks/${id}`, {
        credentials: 'include',
        headers: await headers()
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
        id?: string
    }>
}

export default async function Page({ params: paramsPromise }: Args) {
    const { id = "" } = await paramsPromise
    const data = await getData(id)
    const overlays = await getOverlays(id);

    if (!data) return null;

    return (
        <div className="container mx-auto py-10">
            {data.pdf_path && <EditForm pdfId={data.pdf_path} initialOverlays={overlays} flipBook={data} pdfPath={process.env.PDF_URL + "/" + data.pdf_path}/>}
        </div>
    )
}
