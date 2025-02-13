"use server"
import { cookies } from 'next/headers'
import {redirect} from "next/navigation";

async function validateToken(token: string): Promise<boolean> {
    const res = await fetch(`${process.env.BACKEND_URL}/session/validate`, {
        method: "POST",
        body: JSON.stringify({token}),
        headers: {
            "Content-Type": "application/json",
        }
    });
    if (!res.ok) return false;

    const data = await res.json();

    return data["user_token"].isAdmin;
}

const AdminRoute = async ({children}: { children: React.ReactNode }) => {
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token')?.value;
    const tokenIsValid = await validateToken(userToken||"");

    if (!userToken || !tokenIsValid) {
        redirect('/admin');
    }

    return <>
        {children}
    </>
}


export default AdminRoute;
