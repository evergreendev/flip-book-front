"use client"

import {handleLogin} from "@/common/Auth/actions";
import {redirect} from "next/navigation";
import {useActionState} from "react";

const LoginForm = () => {
    const [state, formAction] = useActionState(handleLogin, {error:null,redirect:false});

    if (state.redirect) redirect("/admin/dashboard"); //todo refactor so this is a constant

    return <form action={formAction}>
        {
            state.error && <div className="text-red-900 bg-red-100 p-4">{state.error}</div>
        }
        <div className="flex gap-2 m-2">
            <label htmlFor="email">Email</label>
            <input name="email" type="text"/>
        </div>
        <div className="flex gap-2 m-2">
            <label htmlFor="password">Password</label>
            <input name="password" type="password"/>
        </div>

        <button>Log In</button>
    </form>
}

export default LoginForm;
