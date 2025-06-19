import {redirect} from "next/navigation";

const Page = () => {
    redirect("/admin/dashboard/flipbooks");

    return <div>
        Protected Page
    </div>
}

export default Page;
