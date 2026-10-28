"use server";

import {cookies} from "next/headers";
import {INVALID_LINK, PASSWORD_ERROR, passwordError, RecoveryResult, retryDeadline, validResetToken} from "../passwordRecovery";

async function recoveryRequest(endpoint: string, body: Record<string, string>): Promise<RecoveryResult> {
    try {
        const response = await fetch(`${process.env.BACKEND_URL}/auth/${endpoint}`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body),
            cache: "no-store",
            referrerPolicy: "no-referrer",
        });
        const data = await response.json();
        if (response.status === 200) return {message: data.message};
        if (response.status === 429) return {
            error: data.error || "Too many attempts. Please try again later.",
            retryAt: retryDeadline(response.headers.get("Retry-After")),
        };
        return {
            error: data.error || "Unable to process your request. Please try again later.",
            invalidLink: endpoint === "reset-password" && data.error === INVALID_LINK,
        };
    } catch {
        // Never report exceptions or request bodies: they may contain passwords/tokens.
        return {error: "Unable to connect. Please check your connection and try again."};
    }
}

export async function forgotPassword(email: string): Promise<RecoveryResult> {
    if (typeof email !== "string" || !email) return {error: "Please enter your email address."};
    return recoveryRequest("forgot-password", {email});
}

export async function resetPassword(token: string, password: string): Promise<RecoveryResult> {
    if (!validResetToken(token)) return {error: INVALID_LINK, invalidLink: true};
    if (typeof password !== "string" || passwordError(password, password)) return {error: PASSWORD_ERROR};
    const result = await recoveryRequest("reset-password", {token, password});
    if (result.message) {
        const cookieStore = await cookies();
        cookieStore.delete("user_token");
        cookieStore.delete("refresh_token");
    }
    return result;
}
