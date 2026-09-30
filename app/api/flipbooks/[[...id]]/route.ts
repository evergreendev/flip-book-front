import {NextRequest, NextResponse} from 'next/server';
import {checkOrRefreshToken} from "@/app/common/Auth/actions";
import {cookies} from "next/headers";

const userTokenKey = "user_token";
const refreshTokenKey = "refresh_token";

export async function GET(request: NextRequest, {params}: { params: Promise<{ id?: string[] }> }) {
    const cookieStore = await cookies();
    const userTokenFromCookies = cookieStore.get(userTokenKey);
    const refreshTokenFromCookies = cookieStore.get(refreshTokenKey);
    const {id} = await params;
    const searchParams = request.nextUrl.searchParams
    const query = new URLSearchParams();
    for (const key of ['page', 'limit', 'orderBy', 'orderDirection']) {
        const value = searchParams.get(key);
        if (value !== null) query.set(key, value);
    }
    const title = searchParams.get('title')?.trim();
    if (title) query.set('title', title);
    const showDrafts = searchParams.get('showDrafts');
    if (showDrafts && showDrafts !== 'false') query.set('showDrafts', showDrafts);

    const userToken = await checkOrRefreshToken(userTokenFromCookies, refreshTokenFromCookies);

    const res = await fetch(`${process.env.BACKEND_URL}/flipbooks${id?.length ? '/' + id.join('/') : ''}?${query}`, {
        method: "GET",
        cache: "no-store",
        headers: userToken ? {
            "Authorization": `Bearer ${userToken?.value}`,
        } : {}
    });

    const data = await res.json();

    return NextResponse.json(data, {status: res.status});
}
