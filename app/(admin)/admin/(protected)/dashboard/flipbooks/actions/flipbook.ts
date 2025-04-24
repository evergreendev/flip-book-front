'use server'

import {cookies} from "next/headers";
import {revalidatePath, revalidateTag} from "next/cache";

export async function deleteFlipBook(id: string) {
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token');

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
