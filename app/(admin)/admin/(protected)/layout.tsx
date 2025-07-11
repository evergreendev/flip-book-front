import type { Metadata } from "next";
import AdminRoute from "@/app/common/Auth/AdminRoute";

export const metadata: Metadata = {
    title: "Evergreen Flip Book",
    description: "Interactive PDFs",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <AdminRoute>
            {children}
        </AdminRoute>
    );
}
