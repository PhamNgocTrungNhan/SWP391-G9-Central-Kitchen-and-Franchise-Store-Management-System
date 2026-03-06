import { Link, useLocation } from 'react-router-dom'

const navItems = [
    { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/inventory', icon: 'inventory_2', label: 'Inventory' },
    { to: '/network', icon: 'storefront', label: 'Franchises' },
    { to: '/recipes', icon: 'restaurant_menu', label: 'Recipes' },
    { to: '/delivery', icon: 'fact_check', label: 'Delivery' },
    { to: '/dispatch', icon: 'local_shipping', label: 'Dispatch' },
    { to: '/users', icon: 'manage_accounts', label: 'Users' },
]

export default function Sidebar() {
    const location = useLocation()

    return (
        <aside className="w-64 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2332] overflow-y-auto flex-shrink-0">
            <div className="flex flex-col gap-4 p-4">
                <div className="flex gap-3 items-center mb-4">
                    <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
                        style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuC0hRvuj1Yk1OmX5Yv0jv1TrMis1diOT0CsCpuPLWVPgGDUTlZqQzUMgBJ5f5UPqs41SG1Ih8sRJoXurG80ZrIbiaf-BZKfWXc5bxnUG-GqnOUyApK5xgbevGg0_0_Omhmc0MkKucuDTdhZu0A4cJQi_9lfP0ktRhZCCUVL3Khx5uj6z7UVp9o-Du_KgW_cAIvuouqghAKMhtVtxdJREhGD4rJdP468yPTuHFBsRYChuG9rxPymFiw45DMoZ1sDATwCSYUDthEBdOQ")` }}
                    />
                    <div className="flex flex-col">
                        <h1 className="text-sm font-medium leading-normal">System Admin</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal">Network View</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-1">
                    {navItems.map(({ to, icon, label }) => {
                        const isActive = location.pathname === to
                        return (
                            <Link
                                key={to}
                                to={to}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <span className="material-symbols-outlined">{icon}</span>
                                <p className="text-sm font-medium leading-normal">{label}</p>
                            </Link>
                        )
                    })}
                </nav>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined">logout</span>
                    <p className="text-sm font-medium leading-normal">Log Out</p>
                </Link>
            </div>
        </aside>
    )
}
