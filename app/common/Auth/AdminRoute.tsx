"use server"
import { cookies } from 'next/headers'
import {redirect} from "next/navigation";

const AdminRoute = async ({children}: { children: React.ReactNode }) => {
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token');

    if (!userToken) {
        redirect('/admin');
    }

    return <>
        {children}
    </>
}


export default AdminRoute;
