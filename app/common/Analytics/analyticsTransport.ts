"use server"
// analyticsTransport.ts
type PageTimePayload = {
    sessionId: string;        // per-visit UUID
    readSession: string;
    flipbookId: string;
    page: number;
    ms: number;
    seq: number;              // monotonically increasing per session to order events
    ts_ms: number;               // Date.now()
    idempotencyKey: string;   // `${sessionId}:${seq}`
};

const QUEUE_KEY = "pp_page_time_queue_v1";

export async function enqueueForRetry(payload: PageTimePayload) {
    try {
        const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
        q.push(payload);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch (e:unknown) {
        console.error("Failed to enqueue for retry", e);
        // best-effort; if storage is full, we still tried
    }
}

export async function drainRetryQueue(sender: (p: PageTimePayload[]) => Promise<void>) {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        if (!raw) return;
        const q: PageTimePayload[] = JSON.parse(raw);
        if (!q.length) return;
        localStorage.removeItem(QUEUE_KEY);
        // fire-and-forget; if this fails, they'll get re-queued when onCommit runs again
        void sender(q);
    } catch {}
}

function sendBeaconJSON(url: string, data: unknown): boolean {
    if (!("sendBeacon" in navigator)) return false;
    try {
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        return navigator.sendBeacon(url, blob);
    } catch {
        return false;
    }
}

export async function sendPageTimes(
    payloads: PageTimePayload[]
): Promise<void> {
    const url = `${process.env.BACKEND_URL}/analytics/events/read`;
    // Try beacon first (best on pagehide)
    if (sendBeaconJSON(url, payloads)) return;

    // Fallback for older browsers / larger payloads
    try {
        await fetch(url, {
            method: "POST",
            body: JSON.stringify(payloads),
            headers: { "Content-Type": "application/json" },
            keepalive: true, // important when unloading
            credentials: "include",
        });
    } catch {
        // If the network is down, re-queue
        payloads.forEach(enqueueForRetry);
    }
}
