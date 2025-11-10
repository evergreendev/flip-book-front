import {FlipBook} from "@/app/types";
import Image from "next/image";
import Link from "next/link";
import {format} from "date-fns";
import AdminViewToolBar from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/FlipBookMultiView/AdminViewToolBar";

const getReadsByFlipbookId = async (flipbookId: string): Promise<Response> => {

    return await fetch(`${process.env.BACKEND_URL}/analytics/events/read/${flipbookId}`, {})
}

const FlipBookAdminView = async ({flipBook}: { flipBook: FlipBook }) => {
    const mode = "edit";
    const reads = await getReadsByFlipbookId(flipBook.id);
    const readsData = await reads.json();

    switch (mode) {
        case "edit":
            return <Link href={`/admin/dashboard/edit/${flipBook.id}`}
                         className="flex justify-between w-full border-t border-b border-gray-200 p-2 items-center hover:bg-green-50/50 transition-all"
            >
                <div className="flex items-center">
                    {
                        flipBook.cover_path ?
                            <Image className="mr-4 group-hover:shadow-lg transition-shadow border border-gray-200"
                                   width={100} height={100}
                                   src={process.env.PDF_URL + "/" + flipBook.cover_path} alt=""/> :
                            <div className="size-44 mr-4 bg-gray-50"/>
                    }
                    <div className="flex justify-between w-full">
                        <div>
                            <h2 className="text-left font-bold">{flipBook.title}</h2>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    flipBook.status === 'published'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {flipBook.status === 'published' ? 'Published' : 'Draft'}
                                </span>
                                <p className="text-sm text-gray-600 text-left">Modified: {flipBook.updated_at ? format(new Date(flipBook.updated_at), 'MMMM d, yyyy') : ''}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="ml-auto">
                    <AdminViewToolBar id={flipBook.id} reads={readsData}/>
                </div>
            </Link>
        default:
            return <div>
                <Link href={`/admin/dashboard/edit/${flipBook.id}`}
                      className="block hover:-translate-y-2 group transition-all">
                    {
                        flipBook.cover_path ?
                            <Image
                                className="w-full mx-auto group-hover:shadow-lg transition-shadow border border-gray-200"
                                width={200} height={200}
                                src={process.env.PDF_URL + "/" + flipBook.cover_path} alt=""/> :
                            <div className="size-44 w-full mx-auto bg-gray-50"/>
                    }
                </Link>
                <h2 className="text-left font-bold">{flipBook.title}</h2>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                        flipBook.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}>
                        {flipBook.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    <p className="text-sm text-gray-600 text-left">{flipBook.published_at ? format(new Date(flipBook.published_at), 'MMMM d, yyyy') : ''}</p>
                </div>
            </div>
    }


}

export default FlipBookAdminView;
