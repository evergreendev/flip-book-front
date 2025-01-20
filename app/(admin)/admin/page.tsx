"use server"
import LoginForm from "@/common/Auth/components/LoginForm";
import {handleLogin} from "@/common/Auth/actions";

const Page = async () => {

    return <div>
        <LoginForm handleLogin={handleLogin} />
    </div>
}

export default Page;
