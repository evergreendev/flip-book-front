export type FlipBook = {
    pdf_path: string | null,
    path_name: string | null,
    password: string | null,
    id: string,
    title: string | null,
    status: "draft" | "published" | "private",
    cover_path: string | null,
    published_at: string | null,
    created_at: string|null,
    updated_at: string|null,
}
