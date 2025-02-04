"use client"

import {handleLogin} from "../actions";
import {redirect} from "next/navigation";
import {useActionState} from "react";

const LoginForm = () => {
    const [state, formAction] = useActionState(handleLogin, {error: null, redirect: false});

    if (state.redirect) redirect("/admin/dashboard"); //todo refactor so this is a constant

    return <div className="flex flex-col justify-center items-center w-full min-h-screen">            {
        state.error && <div className="text-red-900 bg-red-100 p-4 mb-4">{state.error}</div>
    }
        <form className="border-white border p-4 rounded" action={formAction}>

            <div className="flex gap-2 m-2">
                <label htmlFor="email">Email</label>
                <input className="bg-background border-b border-b-white" name="email" type="text"/>
            </div>
            <div className="flex gap-2 m-2">
                <label htmlFor="password">Password</label>
                <input className="bg-background border-b border-b-white" name="password" type="password"/>
            </div>

            <button className="mx-auto mt-5 bg-white text-black block p-2 rounded">Log In</button>
        </form>
    </div>
}

export default LoginForm;
