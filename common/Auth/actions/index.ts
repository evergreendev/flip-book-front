import {cookies} from "next/headers";
import {redirect} from "next/navigation";

const userTokenKey = "user_token";
const dashboardUrl = "/admin/dashboard";

export async function handleLogin() {
    "use server"
    const cookieStore = await cookies();
    cookieStore.set(userTokenKey, 'testtoken', {
        secure: process.env.NODE_ENV === "production",
        sameSite: true,
    });

    redirect(dashboardUrl);
}

export async function handleLogout() {
    "use server"
    const cookieStore = await cookies();
    cookieStore.delete(userTokenKey);

    redirect(dashboardUrl);
}
