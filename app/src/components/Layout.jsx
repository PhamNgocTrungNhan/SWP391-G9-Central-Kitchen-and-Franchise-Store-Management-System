import { Outlet } from 'react-router-dom'

export default function Layout() {
    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <div className="flex h-full grow flex-col">
                <Outlet />
            </div>
        </div>
    )
}
