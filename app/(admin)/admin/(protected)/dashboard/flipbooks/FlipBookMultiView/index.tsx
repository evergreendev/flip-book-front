import {FlipBook} from "@/app/types";
import FlipBookAdminView from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/FlipBookMultiView/FlipBookAdminView";

const FlipBookMultiView = ({flipBooks}:{flipBooks:FlipBook[]}) => {
    const gridViewClass = "grid sm:grid-cols-6 gap-4 gap-y-24 sm:gap-y-4";

    return <div className="grid grid-cols-1">
        {
            flipBooks.map((flipBook) => <FlipBookAdminView flipBook={flipBook} key={flipBook.id}/>)
        }
    </div>
}

export default FlipBookMultiView;
