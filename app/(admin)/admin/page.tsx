"use server"
import LoginForm from "@/app/common/Auth/components/LoginForm";
import {getUsers} from "../../common/Auth/actions";
import RegisterForm from "@/app/common/Auth/components/RegisterForm";

const Page = async () => {

    const users = await getUsers();

    if (users.length === 0) {
        return <div>
            <RegisterForm/>
        </div>;
    }

    return <div>
        <LoginForm/>
    </div>
}

export default Page;
