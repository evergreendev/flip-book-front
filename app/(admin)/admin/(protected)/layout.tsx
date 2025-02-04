import type { Metadata } from "next";
import AdminRoute from "@/app/common/Auth/AdminRoute";
import Header from "@/app/(admin)/admin/(protected)/components/Header";

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
            <Header />
            {children}
        </AdminRoute>
    );
}
