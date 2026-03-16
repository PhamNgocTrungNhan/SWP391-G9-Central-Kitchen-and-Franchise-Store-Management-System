import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navItems = [
    { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/inventory', icon: 'inventory_2', label: 'Inventory' },
    {
        icon: 'apartment',
        label: 'Tổ chức',
        children: [
            { to: '/organization/stores', icon: 'storefront', label: 'Cửa hàng' },
            { to: '/organization/kitchens', icon: 'kitchen', label: 'Bếp trung tâm' },
        ],
    },
    { to: '/recipes', icon: 'restaurant_menu', label: 'Recipes' },
    { to: '/delivery', icon: 'fact_check', label: 'Delivery' },
    { to: '/dispatch', icon: 'local_shipping', label: 'Dispatch' },
    { to: '/users', icon: 'manage_accounts', label: 'Users' },
    { to: '/store-orders', icon: 'shopping_cart', label: 'Store Orders' },
    { to: '/order-management', icon: 'assignment', label: 'Order Management' },
    { to: '/products', icon: 'inventory', label: 'Products' },
    { to: '/system-config', icon: 'settings', label: 'System Config' },
]

export default function Sidebar() {
    const location = useLocation()
    const [isOrganizationOpen, setIsOrganizationOpen] = useState(location.pathname.startsWith('/organization'))

    useEffect(() => {
        if (location.pathname.startsWith('/organization')) {
            setIsOrganizationOpen(true)
        }
    }, [location.pathname])

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
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal">Organization View</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-1">
                    {navItems.map((item) => {
                        if (item.children) {
                            const hasActiveChild = item.children.some((child) => location.pathname === child.to)

                            return (
                                <div key={item.label} className="flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsOrganizationOpen((prev) => !prev)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${hasActiveChild
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="material-symbols-outlined">{item.icon}</span>
                                            <span className="text-sm font-medium leading-normal">{item.label}</span>
                                        </span>
                                        <span className="material-symbols-outlined text-[20px]">{isOrganizationOpen ? 'expand_less' : 'expand_more'}</span>
                                    </button>

                                    {isOrganizationOpen ? (
                                        <div className="ml-4 flex flex-col gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                                            {item.children.map((child) => {
                                                const isChildActive = location.pathname === child.to
                                                return (
                                                    <Link
                                                        key={child.to}
                                                        to={child.to}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isChildActive
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                            }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">{child.icon}</span>
                                                        <span className="text-sm font-medium leading-normal">{child.label}</span>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                            )
                        }

                        const isActive = location.pathname === item.to
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <span className="material-symbols-outlined">{item.icon}</span>
                                <p className="text-sm font-medium leading-normal">{item.label}</p>
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
