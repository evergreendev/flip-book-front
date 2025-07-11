"use server"
import RegisterForm from "@/app/common/Auth/components/RegisterForm";
import Header from "@/app/(admin)/admin/(protected)/components/Header";

const Page = async () => {
    return <>
        <Header/>
        <div>
            <RegisterForm/>
        </div>
    </>
;
}

export default Page;
