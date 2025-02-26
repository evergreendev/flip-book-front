"use server"

import {cookies} from "next/headers";
import {Overlay} from "@/app/common/Flipbooks/components/Flipbook";

export async function handleEdit(prevState: { flipBookId:string, error?: string | null, redirect?: string | null | boolean }, formData: FormData) {
    if (!process.env.BACKEND_URL) return {...prevState, error: "Something went wrong. Please try again."};

    console.log(formData)

    const overlays = formData.get("overlays");



    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token');
    const res = await fetch(`${process.env.BACKEND_URL}/flipbooks/${prevState.flipBookId}`, {
        method: "PUT",
        body: formData,
        headers: {
            "Authorization": `Bearer ${userToken?.value}`,
        }
    });

    if (res.status === 401) {
        cookieStore.delete('user_token');
    }
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


    return {error: null, redirect: "/admin/dashboard/edit/"+pdf.id, flipBookId: prevState.flipBookId};
}
