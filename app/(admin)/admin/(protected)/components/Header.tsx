import LogoutButton from "@/app/common/Auth/components/LogoutButton";
import {handleLogout} from "@/app/common/Auth/actions";
import Link from "next/link";

const Header = () => {
    return <div className="w-full bg-slate-800 p-4 flex items-center justify-center gap-2">
        <Link className="border-white border px-1" href="/admin/dashboard/register">Add User</Link>
        <Link className="border-white border px-1" href="/admin/dashboard/edit">Create New Flip Book</Link>
        <LogoutButton handleLogout={handleLogout}>
            Log Out
        </LogoutButton>
    </div>
}

export default Header;
