export type FlipBook = {
    pdf_path: string | null,
    path_name: string | null,
    password: string | null,
    id: string,
    title: string | null,
    status: "draft" | "published" | "private"
}
