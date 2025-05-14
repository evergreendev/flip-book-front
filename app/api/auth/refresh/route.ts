import {NextResponse} from 'next/server';
import {checkOrRefreshToken} from "@/app/common/Auth/actions";
import {cookies} from "next/headers";

const userTokenKey = "user_token";
const refreshTokenKey = "refresh_token";

export async function GET() {
    const cookieStore = await cookies();
    const userTokenFromCookies = cookieStore.get(userTokenKey);
    const refreshTokenFromCookies = cookieStore.get(refreshTokenKey);

    const userToken = await checkOrRefreshToken(userTokenFromCookies, refreshTokenFromCookies);

    if (!userToken?.value) {
        return NextResponse.json({userToken}, {status: 401});
    } else {
        return NextResponse.json({userToken});
    }
}
