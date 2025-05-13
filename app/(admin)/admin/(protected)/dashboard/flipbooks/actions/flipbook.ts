'use server'
import {revalidatePath, revalidateTag} from "next/cache";
import {checkOrRefreshToken} from "@/app/common/Auth/actions";

export async function deleteFlipBook(id: string) {
    const userToken = await checkOrRefreshToken();

    const response = await fetch(`${process.env.BACKEND_URL}/flipbooks/${id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userToken?.value}`,
            // Use server-side auth mechanisms instead of localStorage
        }
    });

    // This is the key part - revalidate the path to refresh the data
    revalidatePath('/admin/dashboard');
    revalidateTag("flipbooks");

    return response.ok;
}
