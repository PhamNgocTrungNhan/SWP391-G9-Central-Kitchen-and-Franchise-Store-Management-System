const batches = [
    {
        name: 'All-Purpose Flour', batch: 'B-FL-231015', supplier: 'Golden Grains Co.',
        received: 'Oct 15, 2023', expiry: 'Oct 15, 2024', status: 'SAFE', days: '365 days',
        statusClass: 'bg-status-safe-bg text-status-safe dark:bg-status-safe-bg-dark dark:text-green-300',
        barColor: 'bg-status-safe', barW: '80%', current: '800 kg', total: '1000 kg',
        rowClass: 'bg-primary/5 dark:bg-primary/10', icon: 'grain',
    },
    {
        name: 'Fresh Tomatoes', batch: 'B-TM-231102', supplier: 'Valley Farms',
        received: 'Nov 02, 2023', expiry: 'Nov 09, 2023', status: 'NEAR EXPIRY', days: '2 days',
        statusClass: 'bg-status-warning-bg text-status-warning dark:bg-status-warning-bg-dark dark:text-yellow-300',
        barColor: 'bg-status-warning', barW: '30%', current: '30 kg', total: '100 kg',
        rowClass: '', icon: 'eco',
    },
    {
        name: 'Fresh Basil', batch: 'B-FB-231028', supplier: 'Green Leaf Produce',
        received: 'Oct 28, 2023', expiry: 'Nov 04, 2023', status: 'EXPIRED', days: '',
        statusClass: 'bg-status-danger-bg text-status-danger dark:bg-status-danger-bg-dark dark:text-red-300',
        barColor: 'bg-status-danger', barW: '20%', current: '10 bunches', total: '50 bunches',
        rowClass: 'bg-status-danger-bg/30 dark:bg-status-danger-bg-dark/20', icon: 'local_pizza',
    },
]

export default function BatchTraceabilityPage() {
    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-4 md:px-10 py-3 bg-white dark:bg-[#1a2235] rounded-xl shadow-sm mx-4 md:mx-12 xl:mx-40 mt-5 mb-0">
                <div className="flex items-center gap-4 text-primary">
                    <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-slate-900 dark:text-slate-100">Central Kitchen</h2>
                </div>
                <div className="hidden lg:flex items-center gap-9">
                    {['Inventory', 'Production', 'Quality Control', 'Traceability', 'Suppliers', 'Reports'].map((item, i) => (
                        <a key={item} href="#" className={`text-sm font-medium ${i === 0 ? 'text-primary font-semibold border-b-2 border-primary pb-1' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors'}`}>{item}</a>
                    ))}
                </div>
                <div className="flex gap-2 items-center">
                    <button className="flex items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-sm transition-colors">
                        <span className="material-symbols-outlined mr-2 text-[20px]">add_circle</span>Create Batch
                    </button>
                    <button className="flex items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-[#242e47] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-700">
                        <span className="material-symbols-outlined mr-2 text-[20px]">download</span>Export
                    </button>
                    <button className="relative flex items-center justify-center rounded-lg h-10 w-10 bg-white dark:bg-[#242e47] border border-slate-200 dark:border-slate-700 transition-colors hover:bg-slate-50">
                        <span className="material-symbols-outlined text-[20px]">notifications</span>
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full" />
                    </button>
                </div>
            </header>

            <div className="px-4 md:px-8 lg:px-12 xl:px-40 flex flex-1 justify-center py-5">
                <div className="flex flex-col max-w-[1440px] w-full flex-1">
                    <div className="flex flex-col xl:flex-row gap-6">
                        {/* Main Table */}
                        <div className="flex-1 flex flex-col">
                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-6 bg-white dark:bg-[#1a2235] rounded-t-xl border border-b-0 border-slate-200 dark:border-slate-700">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold leading-tight">Batch Traceability &amp; Inventory</h1>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage ingredient batches, monitor expiry dates, and track usage.</p>
                                </div>
                                <button className="flex items-center justify-center rounded-lg h-10 px-5 bg-white dark:bg-[#242e47] border border-slate-200 dark:border-slate-700 text-sm font-medium shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    <span className="material-symbols-outlined mr-2 text-[20px]">qr_code_scanner</span>Scan Delivery
                                </button>
                            </div>
                            {/* Tabs */}
                            <div className="bg-white dark:bg-[#1a2235] border-x border-slate-200 dark:border-slate-700">
                                <div className="flex border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 gap-6 md:gap-8 overflow-x-auto no-scrollbar">
                                    {['All Zones', 'Dry Storage', 'Cold Storage', 'Frozen Storage'].map((tab, i) => (
                                        <a key={tab} href="#" className={`flex items-center justify-center pb-3 pt-4 whitespace-nowrap text-sm ${i === 0 ? 'border-b-2 border-primary text-primary font-bold' : 'border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 transition-colors font-medium'}`}>{tab}</a>
                                    ))}
                                </div>
                            </div>
                            {/* Search */}
                            <div className="px-4 md:px-6 py-4 bg-white dark:bg-[#1a2235] border-x border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between">
                                <label className="flex flex-col h-10 w-full md:max-w-md relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                    <input className="form-input flex w-full flex-1 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#242e47] h-full pl-10 px-4 text-sm font-medium transition-shadow" placeholder="Search by Ingredient Name, Batch ID, or Supplier..." />
                                </label>
                                <div className="flex gap-2 w-full md:w-auto">
                                    {['filter_list', 'sort'].map(icon => (
                                        <button key={icon} className="flex items-center justify-center rounded-lg h-10 px-4 bg-slate-50 dark:bg-[#242e47] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 text-sm font-medium border border-slate-200 dark:border-slate-700 flex-1 md:flex-none">
                                            <span className="material-symbols-outlined mr-2 text-[18px]">{icon}</span>{icon === 'filter_list' ? 'Filter' : 'Sort'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Table */}
                            <div className="p-4 md:p-6 bg-white dark:bg-[#1a2235] border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-xl shadow-sm">
                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-[#242e47] border-b border-slate-200 dark:border-slate-700">
                                                {['Ingredient Name', 'Batch ID', 'Supplier', 'Received Date', 'Expiry Date', 'Stock Level', 'Actions'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {batches.map(b => (
                                                <tr key={b.batch} className={`hover:bg-slate-50/50 dark:hover:bg-[#242e47]/50 transition-colors cursor-pointer ${b.rowClass}`}>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-[#242e47] flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                                                <span className="material-symbols-outlined text-slate-400 text-[18px]">{b.icon}</span>
                                                            </div>
                                                            <span className="text-sm font-semibold">{b.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-[#242e47] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-mono">{b.batch}</span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-sm">{b.supplier}</td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-sm">{b.received}</td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm">{b.expiry}</span>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold w-fit ${b.statusClass}`}>{b.status}{b.days ? ` (${b.days})` : ''}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap min-w-[150px]">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="font-medium">{b.current}</span>
                                                                <span className="text-slate-400">{b.total}</span>
                                                            </div>
                                                            <div className="w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#242e47] h-1.5">
                                                                <div className={`h-full rounded-full ${b.barColor}`} style={{ width: b.barW }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                                        <button className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-[#242e47] transition-colors" title="Quality Check">
                                                            <span className="material-symbols-outlined text-[20px]">fact_check</span>
                                                        </button>
                                                        <button className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-[#242e47] transition-colors" title="Trace Batch">
                                                            <span className="material-symbols-outlined text-[20px]">account_tree</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                                    <span className="text-sm text-slate-400">Showing 1 to 3 of 124 entries</span>
                                    <div className="flex gap-1">
                                        {['Prev', '1', '2', 'Next'].map((p, i) => (
                                            <button key={p} className={`px-3 py-1 rounded-md border text-sm font-medium ${i === 1 ? 'border-primary bg-primary text-white' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2235] text-slate-400 hover:bg-slate-50 dark:hover:bg-[#242e47]'} ${i === 0 ? 'opacity-50' : ''}`}>{p}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trace Panel */}
                        <div className="w-full xl:w-80 flex-shrink-0">
                            <div className="bg-white dark:bg-[#1a2235] rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm sticky top-6">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">account_tree</span>Batch Trace
                                    </h3>
                                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><span className="material-symbols-outlined">close</span></button>
                                </div>
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Selected Batch</h4>
                                    <div className="bg-slate-50 dark:bg-[#242e47] p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <p className="font-bold mb-1">All-Purpose Flour</p>
                                        <p className="text-slate-400 text-xs font-mono mb-2">B-FL-231015</p>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400">Supplier:</span>
                                            <span className="font-medium">Golden Grains Co.</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 pl-5 space-y-6">
                                    {[
                                        { title: 'Received in CK', time: 'Oct 15, 2023 • 08:30 AM', details: ['Quantity: 1000 kg', 'Zone: Dry Storage A'], active: true },
                                        { title: 'Production Run #PR-402', time: 'Oct 18, 2023 • 10:00 AM', box: ['Used: 200 kg', 'Product: Pizza Dough Base', 'Batch Out: B-PDB-231018'] },
                                        { title: 'Dispatched to Stores', time: 'Oct 19, 2023', list: ['Store #001 (Downtown) — 100 kg', 'Store #045 (Mall) — 100 kg'] },
                                    ].map(({ title, time, details, box, list, active }) => (
                                        <div key={title} className="relative">
                                            <div className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-[#1a2235] ${active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700 border-2 border-slate-400'}`} />
                                            <h5 className="text-sm font-bold mb-1">{title}</h5>
                                            <p className="text-xs text-slate-400 mb-2">{time}</p>
                                            {details && details.map(d => <p key={d} className="text-xs text-slate-400">{d}</p>)}
                                            {box && <div className="bg-slate-50 dark:bg-[#242e47] p-2 rounded text-xs border border-slate-200 dark:border-slate-700">{box.map(d => <p key={d} className={d.startsWith('Used') ? 'font-medium' : 'text-slate-400'}>{d}</p>)}</div>}
                                            {list && <div className="space-y-1">{list.map(d => <div key={d} className="flex justify-between items-center bg-slate-50 dark:bg-[#242e47] px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-700"><span>{d.split('—')[0]}</span><span className="font-medium">{d.split('—')[1]}</span></div>)}</div>}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <button className="w-full flex items-center justify-center rounded-lg h-10 px-4 bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-sm font-bold">View Full Trace Report</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
