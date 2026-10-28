import type {Metadata} from "next";
import PasswordRecoveryForm from "../common/Auth/components/PasswordRecoveryForm";

export const metadata: Metadata = {title: "Reset password", referrer: "no-referrer", robots: {index: false, follow: false}};

export default function ResetPasswordPage() {
    return <PasswordRecoveryForm reset/>;
}
