"use client"

import {ColumnDef} from "@tanstack/react-table"
import {MoreHorizontal} from "lucide-react";

import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {useRouter} from "next/navigation";
import {deleteFlipBook} from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/actions/flipbook";

export type FlipBook = {
    pdf_path: string | null,
    path_name: string | null,
    password: string | null,
    id: string,
    title: string | null,
    status: "draft" | "published" | "private"
}

export const columns: ColumnDef<FlipBook>[] = [{
    accessorKey: "title",
    header: "Title",
},
    {
        accessorKey: "status",
        header: "Status",
    },
    {
        id: "actions",
        cell: ({row}) => {
            const flipBook = row.original


            // eslint-disable-next-line react-hooks/rules-of-hooks
            const router = useRouter();

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/dashboard/edit/${(row.original as {id:string}).id}`)}>Edit Flipbook</DropdownMenuItem>
                        <DropdownMenuSeparator/>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.preventDefault();
                                navigator.clipboard.writeText(process.env.NEXT_PUBLIC_BASE_URL + "/" + flipBook.path_name)
                            }}
                        >
                            Copy Flipbook URL
                        </DropdownMenuItem>
                        <form action={async () => {
                            if (!confirm("Are you sure you want to delete this flipbook?")) return;
                            await deleteFlipBook(flipBook.id);
                            router.refresh();
                        }}>
                            <DropdownMenuItem asChild>
                                <button type="submit">Delete FlipBook</button>
                            </DropdownMenuItem>
                        </form>

                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
