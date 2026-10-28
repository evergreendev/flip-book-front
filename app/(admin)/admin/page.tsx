"use server"
import LoginForm from "@/app/common/Auth/components/LoginForm";
import {getUsers} from "../../common/Auth/actions";
import RegisterForm from "@/app/common/Auth/components/RegisterForm";

const Page = async ({searchParams}: {searchParams: Promise<{passwordReset?: string}>}) => {

    const users = await getUsers();

    if (users.length === 0) {
        return <div>
            <RegisterForm/>
        </div>;
    }

    return <div>
        <LoginForm passwordReset={(await searchParams).passwordReset === "success"}/>
    </div>
}

export default Page;
