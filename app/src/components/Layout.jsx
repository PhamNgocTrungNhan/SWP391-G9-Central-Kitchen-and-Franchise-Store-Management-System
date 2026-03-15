import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
    const location = useLocation()
    const isDashboardRoute = location.pathname === '/dashboard'

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <div className="flex h-full grow">
                {!isDashboardRoute && <Sidebar />}
                <div className="flex h-full grow flex-col min-w-0">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
