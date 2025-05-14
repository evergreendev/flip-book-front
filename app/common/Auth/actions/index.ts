"use server"
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {RequestCookie} from "next/dist/compiled/@edge-runtime/cookies";

const userTokenKey = "user_token";
const refreshTokenKey = "refresh_token";
const dashboardUrl = "/admin/dashboard";
const usersResourceName = "/users";
const sessionsResourceName = "/session";

export async function handleLogin(prevState: { error?: string | null, redirect?: boolean | null }, formData: FormData) {
    const email = formData.get("email");
    const password = formData.get("password");

    if (!process.env.BACKEND_URL) return {error: "Invalid Credentials. Please Try again"};

    const res = await fetch(process.env.BACKEND_URL + sessionsResourceName, {
        method: "POST",
        body: JSON.stringify({email, password}),
        headers: {
            "Content-Type": "application/json",
        }
    });
    if (res.status !== 200) return {error: "Invalid Credentials. Please Try again"};

    const data = await res.json();


    const cookieStore = await cookies();
    cookieStore.set(userTokenKey, data[userTokenKey], {
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        httpOnly: true
    });
    cookieStore.set(refreshTokenKey, data[refreshTokenKey], {
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        httpOnly: true
    });

    return {error: null, redirect: true}
}

export async function handleLogout() {
    const cookieStore = await cookies();
    cookieStore.delete(userTokenKey);
    cookieStore.delete(refreshTokenKey);

    redirect(dashboardUrl);
}

export async function handleRegister(prevState: {
    error?: string | null,
    redirect?: boolean | null
}, formData: FormData) {
    const cookieStore = await cookies();
    const newUser = {
        email: formData.get("email"),
        password: formData.get("password"),
    }
    const token = await checkOrRefreshToken();

    const res = await fetch(process.env.BACKEND_URL + usersResourceName, {
        method: "POST",
        headers: {"Content-Type": "application/json", "Authorization": `Bearer ${token?.value}`},
        body: JSON.stringify(newUser)
    });

    if (res.status === 401) {
        cookieStore.delete(userTokenKey);
        cookieStore.delete(refreshTokenKey);
    }
    if (res.status !== 200) return {...prevState, error: "Invalid Credentials. Please Try again"};

    if (res.status !== 200) {
        return {
            error: "Something went wrong please try again",
            redirect: false
        }
    }

    return {error: null, redirect: true}
}

export async function getUsers() {
    const res = await fetch(`${process.env.BACKEND_URL}${usersResourceName}`, {cache: "no-store"})
    return await res.json();
}

export async function checkOrRefreshToken(userTokenParam?: RequestCookie, refreshTokenParam?: RequestCookie): Promise<RequestCookie | null> {
    const cookieStore = await cookies();
    const userToken = userTokenParam || cookieStore.get(userTokenKey);
    const refreshToken = refreshTokenParam || cookieStore.get(refreshTokenKey);

    function handleBadToken() {
        cookieStore.delete(userTokenKey)
        cookieStore.delete(refreshTokenKey)

        return null;
    }

    const res = await fetch(process.env.BACKEND_URL + "/session/validate", {
        method: "POST",
        body: JSON.stringify({token: userToken?.value}),
        headers: {
            "Content-Type": "application/json",
        }
    });

    if (res.status === 401) {//Our token is expired, attempt to refresh
        const refreshRes = await fetch(process.env.BACKEND_URL + "/session/refresh", {
            method: "POST",
            body: JSON.stringify({[refreshTokenKey]: refreshToken?.value}),
            headers: {
                "Content-Type": "application/json",
            }
        })


        if (refreshRes.status === 401) {
            handleBadToken();
        }

        const refreshData = await refreshRes.json();

        cookieStore.set(userTokenKey, refreshData[userTokenKey])
        return {name: userTokenKey, value: refreshData[userTokenKey]};
    }

    return userToken || null;
}
