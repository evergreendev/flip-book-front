import {cookies} from "next/headers";
import {FlipBook} from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/columns";
import EditForm from "@/app/(admin)/admin/(protected)/dashboard/edit/components/EditForm";
import {Overlay} from "@/app/common/Flipbooks/types";


//todo move this somewhere better

async function getData(id:string): Promise<FlipBook|null> {
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token');
    const flipbookRes = await fetch(`${process.env.BACKEND_URL}/flipbooks/${id}`, {
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
            {data.pdf_path && <EditForm initialOverlays={overlays} flipBook={data} pdfPath={process.env.PDF_URL + "/" + data.pdf_path}/>}
        </div>
    )
}
