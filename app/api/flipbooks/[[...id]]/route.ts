import {NextRequest, NextResponse} from 'next/server';
import {checkOrRefreshToken} from "@/app/common/Auth/actions";
import {cookies} from "next/headers";

const userTokenKey = "user_token";
const refreshTokenKey = "refresh_token";

export async function GET(request: NextRequest, {params}: { params: Promise<{ id: string }> }) {
    const cookieStore = await cookies();
    const userTokenFromCookies = cookieStore.get(userTokenKey);
    const refreshTokenFromCookies = cookieStore.get(refreshTokenKey);
    const {id} = await params;
    const searchParams = request.nextUrl.searchParams
    const showDrafts = searchParams.get('showDrafts')

    const userToken = await checkOrRefreshToken(userTokenFromCookies, refreshTokenFromCookies);

    const res = await fetch(`${process.env.BACKEND_URL}/flipbooks/${id||""}?showDrafts=${showDrafts||"false"}`, {
        method: "GET",
        headers: userToken ? {
            "Authorization": `Bearer ${userToken?.value}`,
        } : {}
    });

    if (res.status !== 200){
        return NextResponse.json({}, {status: 401});
    }

    const data = await res.json();

    return NextResponse.json(data);
}
