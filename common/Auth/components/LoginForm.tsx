"use client"

const LoginForm = ({handleLogin}:{handleLogin:()=>void}) => {
    return <button onClick={() => handleLogin()}>Log In</button>
}

export default LoginForm;
