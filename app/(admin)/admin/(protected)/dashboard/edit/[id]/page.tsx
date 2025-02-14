import {cookies} from "next/headers";
import {FlipBook} from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/columns";
import EditForm from "@/app/(admin)/admin/(protected)/dashboard/edit/components/EditForm";

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

type Args = {
    params: Promise<{
        id?: string
    }>
}

export default async function Page({ params: paramsPromise }: Args) {
    const { id = "" } = await paramsPromise
    const data = await getData(id)

    if (!data) return null;

    return (
        <div className="container mx-auto py-10">
            {data.pdf_path && <EditForm flipBook={data} pdfPath={process.env.PDF_URL + "/" + data.pdf_path}/>}
        </div>
    )
}
