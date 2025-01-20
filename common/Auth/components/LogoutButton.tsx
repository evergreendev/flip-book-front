const LogoutButton = ({handleLogout, children}: { handleLogout: () => void, children: React.ReactNode }) => {
    return <button onClick={handleLogout}>{children}</button>;
}

export default LogoutButton;

