"use server"
import {cookies} from "next/headers";
import {AnalyticsCategory, AnalyticsEvent} from "@/app/common/Analytics/types";
import {handleCreateSession} from "@/app/common/Sessions/actions";

async function addGenericEvent(
    eventType: AnalyticsEvent,
    flipbookId: string,
    sessionId: string,
    userId: string | null = null,
    pageNumber: number | null = null,
) {
    return await fetch(`${process.env.BACKEND_URL}/analytics/events`, {
        method: "POST",
        body: JSON.stringify({
            eventType: eventType,
            flipbookId: flipbookId,
            sessionId: sessionId,
            userId: userId,
            pageNumber: pageNumber,
        }),
        headers: {
            "Content-Type": "application/json"
        }
    })
}

export async function addImpression(flipbookId: string, impressionType: AnalyticsCategory, pageNumber?: number, overlayId?: string|null) {
    const cookieStore = await cookies();
    const userSession = cookieStore.get("user_session")?.value;

    if (!userSession) return null;

    const event = await addGenericEvent("impression", flipbookId, userSession, null, pageNumber);

    if (!event.ok) return null;

    const eventData = await event.json();

    const impression = await fetch(`${process.env.BACKEND_URL}/analytics/events/impression`, {
        method: "POST",
        body: JSON.stringify({
            eventId: eventData.event.id,
            impressionType: impressionType,
            overlayId: overlayId,
        }),
        headers: {
            "Content-Type": "application/json"
        }
    })

    const impressionData = await impression.json();

    return {
        event: eventData.event,
        impression: impressionData.impression
    }
}

export async function addClick(flipbookId: string, pageNumber?: number, overlayId?: string|null, href?: string|null){
    const cookieStore = await cookies();
    const userSession = cookieStore.get("user_session")?.value;

    if (!userSession) return null;

    const event = await addGenericEvent("click", flipbookId, userSession, null, pageNumber);
    if (!event.ok) return null;

    const eventData = await event.json();

    const click = await fetch(`${process.env.BACKEND_URL}/analytics/events/click`, {
        method: "POST",
        body: JSON.stringify({
            eventId: eventData.event.id,
            clickType: "external",
            overlayId: overlayId,
            href: href
        }),
        headers: {
            "Content-Type": "application/json"
        }
    })

    const clickData = await click.json();

    return {
        event: eventData.event,
        impression: clickData.click,
    }

}

export async function runHeartbeat(){
    const cookieStore = await cookies();
    const userSession = cookieStore.get("user_session")?.value;

    if (!userSession) return;

    const res = await fetch(`${process.env.BACKEND_URL}/session/heartbeat`, {
        method: "POST",
        body: JSON.stringify({
            sessionId: userSession,
        }),
        headers: {
            "Content-Type": "application/json"
        }
    });

    const data = await res.json();

    if (data.session.state === "ended"){
        cookieStore.delete("user_session");
        const newSession = await handleCreateSession();
        cookieStore.set("user_session", newSession.sessionId);
    }

    return data;
}
