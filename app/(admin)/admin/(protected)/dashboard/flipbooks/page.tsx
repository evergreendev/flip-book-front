import { FlipBook, columns } from "./columns"
import { DataTable } from "./data-table"
import {checkOrRefreshToken} from "@/app/common/Auth/actions";

async function getData(): Promise<FlipBook[]> {
    const userToken = await checkOrRefreshToken();
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
