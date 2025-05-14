import { FlipBook, columns } from "./columns"
import { DataTable } from "./data-table"
import {headers} from "next/headers";

async function getData(): Promise<FlipBook[]> {
    const flipbookRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/flipbooks/?showDrafts=true`, {
        credentials: 'include',
        headers: await headers()
    });

    if (!flipbookRes.ok) return [];

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
