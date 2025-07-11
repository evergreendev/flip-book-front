"use server"
import UploadForm from "@/app/(admin)/admin/(protected)/dashboard/edit/components/UploadForm";
import Header from "@/app/(admin)/admin/(protected)/components/Header";

const Page = async () => {



    return <div>
        <Header />
        <UploadForm/>
    </div>
}

export default Page;
