"use client";

import Link from "next/link";
import {FormEvent, useEffect, useRef, useState} from "react";
import {forgotPassword, resetPassword} from "../actions/passwordRecovery";
import {INVALID_LINK, passwordError, RecoveryResult, validResetToken} from "../passwordRecovery";

declare global {
    interface Window { __passwordResetToken?: string | null }
}

export default function PasswordRecoveryForm({reset = false}: {reset?: boolean}) {
    const token = useRef<string | null>(null);
    const initialized = useRef(false);
    const submitting = useRef(false);
    const [ready, setReady] = useState(!reset);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [pending, setPending] = useState(false);
    const [result, setResult] = useState<RecoveryResult>({});
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (!reset || initialized.current) return;
        initialized.current = true;
        token.current = window.__passwordResetToken ?? null;
        delete window.__passwordResetToken;
        if (!validResetToken(token.current)) setResult({error: INVALID_LINK, invalidLink: true});
        setReady(true);
    }, [reset]);

    useEffect(() => {
        if (!result.retryAt) { setSeconds(0); return; }
        const update = () => setSeconds(Math.max(0, Math.ceil((result.retryAt! - Date.now()) / 1000)));
        update();
        const timer = window.setInterval(update, 1000);
        return () => window.clearInterval(timer);
    }, [result.retryAt]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting.current || (result.retryAt && result.retryAt > Date.now())) return;
        if (reset) {
            if (!validResetToken(token.current)) { setResult({error: INVALID_LINK, invalidLink: true}); return; }
            const error = passwordError(password, confirmation);
            if (error) { setResult({error}); return; }
        }
        submitting.current = true;
        setPending(true);
        setResult({});
        try {
            const response = reset ? await resetPassword(token.current!, password) : await forgotPassword(email);
            setResult(response);
            if (reset && response.message) {
                token.current = null;
                setPassword("");
                setConfirmation("");
                // Full navigation also discards any cached authenticated UI and form memory.
                window.location.replace("/admin?passwordReset=success");
            }
            if (response.invalidLink) token.current = null;
        } catch {
            setResult({error: "Unable to connect. Please check your connection and try again."});
        } finally {
            submitting.current = false;
            setPending(false);
        }
    }

    return <main className="flex flex-col justify-center items-center w-full min-h-screen p-4">
        <div className="border-white border p-6 rounded w-full max-w-md">
            <h1 className="font-bold text-2xl mb-4">{reset ? "Reset password" : "Forgot password?"}</h1>
            {!ready && <p role="status">Loading reset link…</p>}
            {result.error && <p role="alert" className="text-red-900 bg-red-100 p-4 mb-4">{result.error}</p>}
            {result.message && <p role="status" className="mb-4">{result.message}</p>}
            {seconds > 0 && <p role="status" className="mb-4">Try again in {seconds} seconds.</p>}
            {result.invalidLink ? <Link className="underline" href="/forgot-password">Request another reset email</Link> :
                ready && !result.message && <form onSubmit={submit}>
                    <fieldset disabled={pending || seconds > 0} className="flex flex-col gap-4">
                        {reset ? <>
                            <label htmlFor="new-password">New password</label>
                            <input id="new-password" name="password" type="password" autoComplete="new-password" required
                                className="bg-background border-b border-white" value={password} onChange={e => setPassword(e.target.value)} aria-describedby="password-help"/>
                            <label htmlFor="confirm-password">Confirm password</label>
                            <input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" required
                                className="bg-background border-b border-white" value={confirmation} onChange={e => setConfirmation(e.target.value)}/>
                            <p id="password-help">Use at least 8 characters and no more than 72 UTF-8 bytes.</p>
                        </> : <>
                            <p>Enter your email to request a password reset link.</p>
                            <label htmlFor="recovery-email">Email</label>
                            <input id="recovery-email" name="email" type="email" autoComplete="email" required
                                className="bg-background border-b border-white" value={email} onChange={e => setEmail(e.target.value)}/>
                        </>}
                        <button disabled={pending || seconds > 0} className="bg-white text-black p-2 rounded disabled:opacity-50">
                            {pending ? "Submitting…" : reset ? "Reset password" : "Send reset link"}
                        </button>
                    </fieldset>
                </form>}
            <Link className="block underline mt-4" href="/admin">Back to sign in</Link>
        </div>
    </main>;
}
