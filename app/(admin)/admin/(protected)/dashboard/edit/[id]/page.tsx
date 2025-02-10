import {cookies} from "next/headers";
import {FlipBook} from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/columns";//todo move this somewhere better

async function getData(id:string): Promise<FlipBook> {
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token');
    const flipbookRes = await fetch(`${process.env.BACKEND_URL}/flipbooks/${id}`, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userToken?.value}`
        }
    });
    return await flipbookRes.json()
}

type Args = {
    params: Promise<{
        id?: string
    }>
}

export default async function Page({ params: paramsPromise }: Args) {
    const { id = 'home' } = await paramsPromise
    const data = await getData(id)

    return (
        <div className="container mx-auto py-10">
            {data.title}
            {data.id}
        </div>
    )
}
