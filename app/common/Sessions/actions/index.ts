"use server"

const sessionsResourceName = "/session";


export async function handleCreateSession() {
    const res = await fetch(process.env.BACKEND_URL + sessionsResourceName, {
        method: "POST",
        headers: {"Content-Type": "application/json"}
    });

    const data = await res.json();

    console.log(data);

    return data;
}
