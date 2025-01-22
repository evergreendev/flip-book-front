"use server"
import {cookies} from "next/headers";
import {redirect} from "next/navigation";

const userTokenKey = "user_token";
const dashboardUrl = "/admin/dashboard";

export async function handleLogin(prevState: {error?:string|null, redirect?:boolean|null}, formData: FormData) {
    const email = formData.get("email");
    const password = formData.get("password");

    if (!process.env.BACKEND_URL) return { error: "Invalid Credentials. Please Try again" };

    const res = await fetch(process.env.BACKEND_URL+"/session", {
        method: "POST",
        body: JSON.stringify({email, password}),
    });
    const data = await res.json();

    const cookieStore = await cookies();
    cookieStore.set(userTokenKey, data[userTokenKey], {
        secure: process.env.NODE_ENV === "production",
        sameSite: true,
    });

    return { error: null, redirect: true}
}

export async function handleLogout() {
    const cookieStore = await cookies();
    cookieStore.delete(userTokenKey);

    redirect(dashboardUrl);
}
