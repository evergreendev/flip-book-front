import {cookies} from "next/headers";
import {FlipBook} from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/columns";
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

type Args = {
    params: Promise<{
        slug: string
    }>
}

export default async function Page({params: paramsPromise}: Args) {
    const {slug} = await paramsPromise
    const data = await getData(slug)

    if (!data) return null;

    return (
        <div className="mx-auto h-screen bg-slate-800 p-3">
            <Flipbook pdfUrl={process.env.PDF_URL + "/" + data.pdf_path}/>
        </div>
    )
}
