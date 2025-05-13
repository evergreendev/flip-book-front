import {redirect} from "next/navigation";
import { headers } from 'next/headers';

const AdminRoute = async ({children}: { children: React.ReactNode }) => {

    const authRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/refresh`, {
        credentials: 'include',
        headers: await headers()
    });

    if (!authRes.ok) {
        redirect('/admin');
    }

    return <>
        {children}
    </>
}


export default AdminRoute;
