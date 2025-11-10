"use client"

import {deleteFlipBook} from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/actions/flipbook";
import {useRouter} from "next/navigation";
import {LucideTrendingUp} from "lucide-react";
import {AnalyticsRead} from "@/app/common/Analytics/types";

const AdminViewToolBar = ({id,reads}:{id:string,reads:Record<string, AnalyticsRead[]>}) => {
    const router = useRouter();
    const readCount = Object.keys(reads).length;

    return <div className="flex items-center gap-2">
        <button
            onClick={(e) => {
                e.preventDefault();
                router.push(`/admin/dashboard/analytics/${id}`);
            }}
            title="View analytics"
            className="text-blue-600 hover:text-blue-800 p-2"
        >
            <LucideTrendingUp/>
            {readCount > 0 && <span className="bg-blue-500 text-white rounded-full px-2 py-1 text-xs">{readCount}</span>}
        </button>

        <button
            onClick={(e) => {
                e.preventDefault();
                if (window.confirm('Are you sure you want to delete this publication?')) {
                    deleteFlipBook(id).then(r => {
                        if (r) {
                            window.location.reload();
                        }
                    });
                }
            }}
            title="Delete"
            className="text-red-600 hover:text-red-800 p-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20"
                 fill="currentColor">
                <path fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"/>
            </svg>
        </button>
    </div>
}

export default AdminViewToolBar;
