"use server"
import {Overlay} from "@/app/common/Flipbooks/types";
import {checkOrRefreshToken} from "@/app/common/Auth/actions";

export async function handleEdit(prevState: { flipBookId:string, error?: string | null, redirect?: string | null | boolean }, formData: FormData) {
    if (!process.env.BACKEND_URL) return {...prevState, error: "Something went wrong. Please try again."};

    const overlays = formData.get("overlays");
    const overlaysToDelete = formData.get("overlaysToDelete");

    const userToken = await checkOrRefreshToken();
    const res = await fetch(`${process.env.BACKEND_URL}/flipbooks/${prevState.flipBookId}`, {
        method: "PUT",
        body: formData,
        headers: {
            "Authorization": `Bearer ${userToken?.value}`,
        }
    });

    if (res.status !== 200) return {...prevState, error: "Invalid Credentials. Please Try again"};

    const pdf = await res.json();

    if (overlays){
        JSON.parse(<string>overlays)?.forEach((overlay:Overlay) => {
            fetch(`${process.env.BACKEND_URL}/flipbooks/overlays`, {
                method: "POST",
                body: JSON.stringify(overlay),
                headers: {
                    "Authorization": `Bearer ${userToken?.value}`,
                    "Content-Type": "application/json",
                }
            });
        });
    }

    if (overlaysToDelete && typeof overlaysToDelete === "string"){
        overlaysToDelete.split(",").forEach((id:string) => {
            fetch(`${process.env.BACKEND_URL}/flipbooks/overlays/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${userToken?.value}`,
                }
            });
        })
    }


    return {error: null, redirect: "/admin/dashboard/edit/"+pdf.id, flipBookId: prevState.flipBookId};
}
