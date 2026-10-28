// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {handleCreateSession} from "@/app/common/Sessions/actions";

const COOKIE_NAME = 'user_session' // your analytics session id

export async function middleware(req: NextRequest) {
    const res = NextResponse.next()
    // Public recovery must work without analytics sessions or backend session calls.
    if (/^\/reset-password\/?$/.test(req.nextUrl.pathname)) {
        // Keep secrets out of Next's serialized router tree and browser history state.
        // The head script captures the token from the original browser URL instead.
        const cleanUrl = req.nextUrl.clone();
        cleanUrl.search = "";
        return NextResponse.rewrite(cleanUrl);
    }
    if (/^\/forgot-password\/?$/.test(req.nextUrl.pathname)) return res;
    const sessionIdFromCookie = req.cookies.get(COOKIE_NAME)?.value

    // If no session id cookie, create a new one
    if (!sessionIdFromCookie) {
        const sid = await handleCreateSession();

        res.cookies.set({
            name: COOKIE_NAME,
            value: sid,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        })

        return res;
    }

    const sessionFromDB = await fetch(`${process.env.BACKEND_URL}/session/${sessionIdFromCookie}`);

    const sessionFromDBData = await sessionFromDB.json();


    if (sessionFromDBData[0].state === "ended") {
        const sid = await handleCreateSession();

        res.cookies.set({
            name: COOKIE_NAME,
            value: sid,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        })

        return res;
    }

    return res
}

// Skip static files, _next, and API routes
export const config = {
    matcher: [
        '/((?!_next/|api/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt)).*)',
    ],
}
