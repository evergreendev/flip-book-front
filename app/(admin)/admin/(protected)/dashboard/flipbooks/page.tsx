import { FlipBook, columns } from "./columns"
import { DataTable } from "./data-table"
import {cookies} from "next/headers";

async function getData(): Promise<FlipBook[]> {
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token');
    const flipbookRes = await fetch(process.env.BACKEND_URL + "/flipbooks?showDrafts=true", {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userToken?.value}`
        },
        next: {
            tags: ["flipbooks"]
        }
    });
    const data = await flipbookRes.json();

    return (data as FlipBook[]).map((row) => {
        return {...row,
            title: row.title || "Unnamed Flipbook"
        }
    });
}

export default async function DemoPage() {
    const data = await getData()

    return (
        <div className="container mx-auto py-10">
            <DataTable columns={columns} data={data} />
        </div>
    )
}
