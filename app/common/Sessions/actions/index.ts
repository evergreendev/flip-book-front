"use server"

import {cookies} from "next/headers";

const userSessionKey = "user_session";
const sessionsResourceName = "/session";


export async function handleCreateSession() {
    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get(userSessionKey)?.value;

    if (currentSessionId) {
        return currentSessionId;
    }

    const res = await fetch(process.env.BACKEND_URL + sessionsResourceName, {
        method: "POST",
        headers: {"Content-Type": "application/json"}
    });

    return await res.json();
}

/*export async function getUsers() {
    const res = await fetch(`${process.env.BACKEND_URL}${usersResourceName}`, {cache: "no-store"})
    return await res.json();
}*/
