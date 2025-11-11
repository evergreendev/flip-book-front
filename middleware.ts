// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {handleCreateSession} from "@/app/common/Sessions/actions";

const COOKIE_NAME = 'user_session' // your analytics session id

export async function middleware(req: NextRequest) {
    const res = NextResponse.next()
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
