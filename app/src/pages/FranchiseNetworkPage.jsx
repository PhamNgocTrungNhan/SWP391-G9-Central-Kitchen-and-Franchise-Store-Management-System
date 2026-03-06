const stores = [
    { id: 'CK-001', name: 'Central Kitchen - NYC', manager: 'Sarah Jenkins', email: 'sarah.j@kitchen.com', region: 'Northeast', status: 'Active', icon: 'domain', iconBg: 'bg-primary/10 text-primary' },
    { id: 'FR-042', name: 'Downtown Express', manager: 'Mike Chen', email: 'm.chen@franchise.com', region: 'Northeast', status: 'Active', icon: 'storefront', iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
    { id: 'FR-015', name: 'Uptown Market', manager: 'Elena Rodriguez', email: 'elena.r@franchise.com', region: 'Northeast', status: 'Maintenance', icon: 'storefront', iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
]

const statusStyle = {
    Active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    Maintenance: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
}
const statusDot = { Active: 'bg-emerald-500', Maintenance: 'bg-amber-500' }

export default function FranchiseNetworkPage() {
    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-10 py-3 bg-white dark:bg-background-dark sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">restaurant</span>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Kitchen Admin</h2>
                </div>
                <div className="flex flex-1 justify-end gap-8">
                    <nav className="hidden md:flex items-center gap-9">
                        {['Dashboard', 'Directory', 'Reports', 'Settings'].map((item, i) => (
                            <a key={item} href="#" className={`text-sm font-medium leading-normal transition-colors ${i === 1 ? 'text-primary' : 'text-slate-600 dark:text-slate-400 hover:text-primary'}`}>{item}</a>
                        ))}
                    </nav>
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-primary/20"
                        style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuB4-5_YtJOt-e5xhsGgAEn3B4QBbmXwze_YAdQ0uISadWPS5MoNqLBYqA9vpQ8Q5TDJALupnBcETNiDL_kgnD2FLJIIJtkZMOXtTHsD8ivJRv5egQd-eTxcocSF9nbXTL4MD2UdjKbas5q17IW0tizy9sF_4PjGQ46kIaXxRc6l9uyadEAlFAN-p4O96cgz1dUtyLEcAjoutWk1GFGkNKkBsvfvy-RFEGTI7wkJBzpeqFxQfy6ZOeRz-2dhBVSs6zCRtYC7iSyNuBM")` }} />
                </div>
            </header>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark hidden lg:flex flex-col p-4 gap-6">
                    <div>
                        <h1 className="text-base font-semibold">Admin Panel</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Network Management</p>
                    </div>
                    <nav className="flex flex-col gap-2">
                        {[
                            { icon: 'dashboard', label: 'Dashboard', active: false },
                            { icon: 'storefront', label: 'Directory', active: true },
                            { icon: 'inventory_2', label: 'Inventory', active: false },
                            { icon: 'settings', label: 'Settings', active: false },
                        ].map(({ icon, label, active }) => (
                            <a key={label} href="#" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                <span className="material-symbols-outlined">{icon}</span>
                                <span className="text-sm font-medium">{label}</span>
                            </a>
                        ))}
                    </nav>
                    <div className="mt-auto flex flex-col gap-4">
                        <div className="flex flex-col gap-2 rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Total Stores</p>
                            <p className="text-2xl font-bold">48</p>
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                <span className="material-symbols-outlined text-[16px]">trending_up</span><span>+5% this month</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">New Openings</p>
                            <p className="text-2xl font-bold">3</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">In the last 30 days</p>
                        </div>
                    </div>
                </aside>

                {/* Main */}
                <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark p-6 lg:p-8 gap-8 overflow-y-auto">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold leading-tight">Franchise &amp; Kitchen Directory</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mt-1">Manage central kitchens and franchise locations across the network.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">download</span>Export List
                            </button>
                            <button className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
                                <span className="material-symbols-outlined text-[20px]">add</span>Add New Store
                            </button>
                        </div>
                    </div>

                    {/* Map */}
                    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">map</span>Network Map
                            </h3>
                            <div className="flex gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                                    <span className="size-2 rounded-full bg-primary" /> Central Kitchen (1)
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                                    <span className="size-2 rounded-full bg-emerald-500" /> Franchise (47)
                                </span>
                            </div>
                        </div>
                        <div className="w-full h-[300px] lg:h-[400px] bg-slate-100 dark:bg-slate-800 relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 opacity-80" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-slate-400 dark:text-slate-600 flex flex-col items-center gap-2">
                                    <span className="material-symbols-outlined text-5xl">map</span>
                                    <span className="text-sm font-medium">Interactive Map — Network View</span>
                                </div>
                            </div>
                            {/* Pins */}
                            <div className="absolute top-[40%] left-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                                <div className="bg-primary text-white text-xs font-bold px-2 py-1 rounded shadow-lg mb-1 whitespace-nowrap">Central Kitchen NYC</div>
                                <span className="material-symbols-outlined text-primary text-[32px] drop-shadow-md">location_on</span>
                            </div>
                            {[['35%', '45%'], ['55%', '25%'], ['45%', '60%']].map(([t, l], i) => (
                                <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: t, left: l }}>
                                    <span className="material-symbols-outlined text-emerald-500 text-[24px] drop-shadow-md hover:scale-125 transition-transform cursor-pointer">location_on</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Directory Table */}
                    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm flex flex-col">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h3 className="font-semibold text-lg">Store Directory</h3>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                                    <input className="h-10 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary w-full sm:w-64" placeholder="Search stores..." type="text" />
                                </div>
                                <button className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[20px]">filter_list</span>
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                        {['Store Info', 'Manager', 'Region', 'Status', 'Actions'].map(h => (
                                            <th key={h} className={`px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {stores.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                                                        <span className="material-symbols-outlined">{s.icon}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{s.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ID: {s.id} • {s.id.startsWith('CK') ? 'HQ' : 'Franchise'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium">{s.manager}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.email}</p>
                                            </td>
                                            <td className="px-5 py-4"><span className="text-sm">{s.region}</span></td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[s.status]}`}>
                                                    <span className={`size-1.5 rounded-full ${statusDot[s.status]}`} />{s.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button className="text-slate-400 hover:text-primary transition-colors p-1"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                                <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 ml-1"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                            <span>Showing 1 to 3 of 48 entries</span>
                            <div className="flex gap-1">
                                {['Prev', '1', '2', '3', 'Next'].map((p, i) => (
                                    <button key={p} className={`px-3 py-1 rounded border text-sm ${i === 1 ? 'border-primary bg-primary text-white' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{p}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
