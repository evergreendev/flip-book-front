export const PASSWORD_ERROR = "Password must be at least 8 characters and no more than 72 UTF-8 bytes.";
export const INVALID_LINK = "Invalid or expired reset link.";
export const RESET_SUCCESS = "Password reset successfully. Please sign in with your new password.";

export type RecoveryResult = {
    message?: string;
    error?: string;
    invalidLink?: boolean;
    retryAt?: number;
};

export function validResetToken(token: unknown): token is string {
    return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

export function passwordError(password: string, confirmation: string): string | undefined {
    if (Array.from(password).length < 8 || new TextEncoder().encode(password).length > 72) return PASSWORD_ERROR;
    if (password !== confirmation) return "Passwords must match.";
}

export function retryDeadline(value: string | null, now = Date.now()): number {
    if (value && /^\d+$/.test(value)) return now + Number(value) * 1000;
    const date = value ? Date.parse(value) : NaN;
    return Number.isFinite(date) ? Math.max(now, date) : now + 60_000;
}

// Runs in the document head before hydration or any analytics can read the URL.
// The temporary memory slot is deleted as soon as the reset form mounts.
export const captureResetTokenScript = `if (window.location.pathname === '/reset-password' || window.location.pathname === '/reset-password/') {
    var resetTokens = new URLSearchParams(window.location.search).getAll('token');
    window.__passwordResetToken = resetTokens.length === 1 ? resetTokens[0] : null;
    window.history.replaceState(window.history.state, '', window.location.pathname);
    resetTokens = null;
}`;
