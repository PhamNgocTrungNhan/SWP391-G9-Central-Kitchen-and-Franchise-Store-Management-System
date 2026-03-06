import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

const kpiCards = [
    { label: 'Total Network Revenue', value: '$1.45M', trend: '+8.2%', trendType: 'up', sub: 'vs last week', icon: 'payments' },
    { label: 'Production Fulfillment', value: '96.5%', trend: '-1.5%', trendType: 'down-bad', sub: 'vs target (98%)', icon: 'precision_manufacturing' },
    { label: 'Total Food Waste %', value: '2.8%', trend: '-0.4%', trendType: 'down-good', sub: 'vs last week', icon: 'delete_sweep' },
    { label: 'Avg Delivery Time', value: '38 mins', trend: '-4 mins', trendType: 'down-good', sub: 'vs last week', icon: 'local_shipping' },
]

const bars = [
    { label: 'Breads', planned: 80, actual: 85 },
    { label: 'Pastries', planned: 95, actual: 90 },
    { label: 'Sauces', planned: 60, actual: 65 },
    { label: 'Proteins', planned: 75, actual: 70 },
    { label: 'Sides', planned: 50, actual: 45 },
]

const alerts = [
    { id: '#1042 - Downtown Express', region: 'NY Metro', alert: 'Stock Shortage: Croissants', severity: 'Critical', color: 'rose' },
    { id: '#0891 - Airport Terminal C', region: 'Central Hub', alert: 'Fulfillment Delay > 2hrs', severity: 'Warning', color: 'amber' },
    { id: '#2105 - Westside Plaza', region: 'West Coast', alert: 'Sales drop > 15% WoW', severity: 'Notice', color: 'blue' },
]

const severityStyle = {
    Critical: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    Warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    Notice: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
}

export default function DashboardPage() {
    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            <div className="flex h-full grow flex-col">
                <Header title="Central Kitchen Analytics" />
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <aside className="w-64 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2332] overflow-y-auto">
                        <div className="flex flex-col gap-4 p-4">
                            <div className="flex gap-3 items-center mb-4">
                                <div
                                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
                                    style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuC0hRvuj1Yk1OmX5Yv0jv1TrMis1diOT0CsCpuPLWVPgGDUTlZqQzUMgBJ5f5UPqs41SG1Ih8sRJoXurG80ZrIbiaf-BZKfWXc5bxnUG-GqnOUyApK5xgbevGg0_0_Omhmc0MkKucuDTdhZu0A4cJQi_9lfP0ktRhZCCUVL3Khx5uj6z7UVp9o-Du_KgW_cAIvuouqghAKMhtVtxdJREhGD4rJdP468yPTuHFBsRYChuG9rxPymFiw45DMoZ1sDATwCSYUDthEBdOQ")` }}
                                />
                                <div className="flex flex-col">
                                    <h1 className="text-sm font-medium leading-normal">System Admin</h1>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">Network View</p>
                                </div>
                            </div>
                            <nav className="flex flex-col gap-1">
                                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary">
                                    <span className="material-symbols-outlined">dashboard</span>
                                    <p className="text-sm font-medium">Dashboard</p>
                                </div>
                                {[{ icon: 'factory', label: 'Production' }, { icon: 'storefront', label: 'Franchises' }, { icon: 'inventory_2', label: 'Inventory' }, { icon: 'analytics', label: 'Reports' }].map(({ icon, label }) => (
                                    <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                                        <span className="material-symbols-outlined">{icon}</span>
                                        <p className="text-sm font-medium">{label}</p>
                                    </div>
                                ))}
                            </nav>
                            <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-4">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">Advanced Filters</h3>
                                <div className="flex flex-col gap-4 px-3">
                                    {[{ label: 'Date Range', opts: ['Last 7 Days', 'Last 30 Days', 'This Quarter', 'Year to Date'] }, { label: 'Kitchen', opts: ['All Kitchens', 'North Hub (NY)', 'West Hub (CA)', 'South Hub (TX)'] }, { label: 'Store Cluster', opts: ['All Clusters', 'Urban Centers', 'Suburban', 'High Volume'] }].map(({ label, opts }) => (
                                        <div key={label} className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
                                            <select className="form-select w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131b2b] text-sm py-1.5 focus:border-primary focus:ring-primary">
                                                {opts.map(o => <option key={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                    <button className="mt-2 w-full bg-primary hover:bg-primary/90 text-white text-sm font-medium py-2 rounded-md transition-colors">Apply Filters</button>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                                <span className="material-symbols-outlined">settings</span>
                                <p className="text-sm font-medium">Settings</p>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 overflow-y-auto p-6">
                        <div className="flex flex-col max-w-[1400px] mx-auto gap-6">
                            <div className="flex justify-between items-end">
                                <h2 className="text-2xl font-bold leading-tight tracking-[-0.015em]">Network Overview</h2>
                                <div className="text-sm text-slate-500 dark:text-slate-400">Data updated: Just now</div>
                            </div>

                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {kpiCards.map(({ label, value, trend, trendType, sub, icon }) => (
                                    <div key={label} className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-[#1a2332] shadow-sm border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                                            <span className="material-symbols-outlined text-primary/70 text-lg">{icon}</span>
                                        </div>
                                        <p className="tracking-tight text-2xl font-bold leading-tight mt-1">{value}</p>
                                        <div className="flex items-center gap-1 text-xs mt-2">
                                            <span className={`material-symbols-outlined text-sm ${trendType === 'up' || trendType === 'down-good' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {trendType === 'up' || trendType === 'down-bad' ? 'trending_up' : 'trending_down'}
                                            </span>
                                            <span className={`font-medium ${trendType === 'up' || trendType === 'down-good' ? 'text-emerald-500' : 'text-rose-500'}`}>{trend}</span>
                                            <span className="text-slate-400">{sub}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Bar Chart */}
                                <div className="lg:col-span-2 flex flex-col gap-4 rounded-xl p-5 bg-white dark:bg-[#1a2332] shadow-sm border border-slate-100 dark:border-slate-800 min-h-[350px]">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-semibold">Planned vs. Actual Production</h3>
                                        <button className="text-slate-400 hover:text-primary">
                                            <span className="material-symbols-outlined">more_horiz</span>
                                        </button>
                                    </div>
                                    <div className="flex-1 relative mt-4">
                                        <div className="absolute inset-0 flex items-end gap-4 px-8 pb-8 pt-4">
                                            <div className="absolute left-0 top-4 bottom-8 flex flex-col justify-between text-xs text-slate-400 w-8 text-right pr-2">
                                                <span>10k</span><span>7.5k</span><span>5k</span><span>2.5k</span><span>0</span>
                                            </div>
                                            <div className="absolute left-10 right-4 top-4 bottom-8 flex flex-col justify-between">
                                                {[0, 1, 2, 3, 4].map(i => <div key={i} className="w-full border-t border-slate-200 dark:border-slate-700/50" />)}
                                            </div>
                                            <div className="relative z-10 flex-1 flex justify-around items-end h-full ml-6">
                                                {bars.map(({ label, planned, actual }) => (
                                                    <div key={label} className="flex flex-col items-center gap-2 group cursor-pointer">
                                                        <div className="flex gap-1 items-end" style={{ height: '200px' }}>
                                                            <div className="w-6 bg-slate-200 dark:bg-slate-700 rounded-t-sm" style={{ height: `${planned}%` }} />
                                                            <div className="w-6 bg-primary rounded-t-sm" style={{ height: `${actual}%` }} />
                                                        </div>
                                                        <span className="text-xs text-slate-500 font-medium">{label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-center gap-6 mt-2">
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700" /><span className="text-xs text-slate-500">Planned</span></div>
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-primary" /><span className="text-xs text-slate-500">Actual</span></div>
                                    </div>
                                </div>

                                {/* Heatmap */}
                                <div className="flex flex-col gap-4 rounded-xl p-5 bg-white dark:bg-[#1a2332] shadow-sm border border-slate-100 dark:border-slate-800 min-h-[350px]">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-semibold">Store Heatmap</h3>
                                        <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">Order volume &amp; stock turnover concentration</p>
                                    <div className="flex-1 relative rounded-lg overflow-hidden bg-slate-100 dark:bg-[#131b2b] border border-slate-200 dark:border-slate-700 p-2">
                                        <div className="relative w-full h-full flex flex-col gap-1 min-h-[200px]">
                                            {[[0.2, 0.8, 0.4, 0.1], [0.6, 1.0, 0.3, 0.5], [0.3, 0.7, 0.9, 0.2]].map((row, ri) => (
                                                <div key={ri} className="flex-1 flex gap-1">
                                                    {row.map((v, ci) => (
                                                        <div key={ci} className="flex-1 rounded-sm" style={{ backgroundColor: `rgba(19,91,236,${v})` }}>
                                                            {v === 1.0 && <div className="w-full h-full animate-pulse bg-white/20 rounded-sm" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                                        <span>Low Volume</span>
                                        <div className="w-24 h-2 bg-gradient-to-r from-primary/10 to-primary rounded-full" />
                                        <span>High Volume</span>
                                    </div>
                                </div>
                            </div>

                            {/* Alerts Table */}
                            <div className="flex flex-col gap-4 rounded-xl p-5 bg-white dark:bg-[#1a2332] shadow-sm border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-rose-500">warning</span>
                                        Critical Alerts &amp; Underperforming Stores
                                    </h3>
                                    <button className="text-sm text-primary font-medium hover:underline">View All</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider pl-2">Store ID / Name</th>
                                                <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Region</th>
                                                <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alert Type</th>
                                                <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
                                                <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right pr-2">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {alerts.map(({ id, region, alert, severity }) => (
                                                <tr key={id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="py-3 pl-2"><span className="font-medium text-sm">{id}</span></td>
                                                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">{region}</td>
                                                    <td className="py-3 text-sm">{alert}</td>
                                                    <td className="py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${severityStyle[severity]}`}>{severity}</span>
                                                    </td>
                                                    <td className="py-3 text-right pr-2">
                                                        <button className="text-primary hover:text-primary/80 text-sm font-medium">Review</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}
