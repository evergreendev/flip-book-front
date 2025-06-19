import {FlipBook} from "@/app/types";
import FlipBookAdminView from "@/app/(admin)/admin/(protected)/dashboard/flipbooks/FlipBookMultiView/FlipBookAdminView";

const FlipBookMultiView = ({flipBooks}:{flipBooks:FlipBook[]}) => {
    return <div>
        {
            flipBooks.map((flipBook) => <FlipBookAdminView flipBook={flipBook} key={flipBook.id}/>)
        }
    </div>
}

export default FlipBookMultiView;
