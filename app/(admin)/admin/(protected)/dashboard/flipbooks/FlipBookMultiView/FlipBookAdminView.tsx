import {FlipBook} from "@/app/types";

const FlipBookAdminView = ({flipBook}:{flipBook:FlipBook}) => {
    console.log(flipBook);

    return <div>{flipBook.title}</div>
}

export default FlipBookAdminView;
