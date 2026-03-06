import { useState } from 'react'

const recipes = [
    { name: 'Classic Beef Burger', type: 'Finished Product', yield: '1 portion', cost: '$3.45', icon: 'lunch_dining', active: true },
    { name: 'House Burger Sauce', type: 'Semi-Finished', yield: '5L Batch', cost: '$12.50', icon: 'soup_kitchen', active: false },
    { name: 'Brioche Bun', type: 'Semi-Finished', yield: '24pcs Batch', cost: '$4.80', icon: 'bakery_dining', active: false },
]

const bom = [
    { icon: 'grocery', type: 'raw', name: 'Premium Beef Patty (180g)', qty: '1.00', unit: 'pc', cost: '$1.80' },
    { icon: 'link', type: 'link', name: 'Brioche Bun', qty: '1.00', unit: 'pc', cost: '$0.45' },
    { icon: 'link', type: 'link', name: 'House Burger Sauce', qty: '30.00', unit: 'ml', cost: '$0.25' },
    { icon: 'grocery', type: 'raw', name: 'Cheddar Cheese Slice', qty: '2.00', unit: 'pc', cost: '$0.40' },
    { icon: 'eco', type: 'raw', name: 'Iceberg Lettuce (Shredded)', qty: '20.00', unit: 'g', cost: '$0.10' },
]

const steps = [
    { n: 1, title: 'Prep Bun & Grill', desc: 'Toast the brioche bun lightly on the grill for 30 seconds. Grill beef patty for 3 mins each side (Medium).' },
    { n: 2, title: 'Add Cheese', desc: 'Place 2 slices of cheddar on the patty during the last 30 seconds of grilling to melt.' },
    { n: 3, title: 'Assembly', desc: 'Apply House Sauce to top and bottom buns. Bottom bun > Lettuce > Patty with Cheese > Top Bun.' },
]

export default function RecipeBOMPage() {
    const [active, setActive] = useState(0)

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>restaurant_menu</span>
                    <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight">KitchenOps</h2>
                </div>
                <div className="flex flex-1 justify-end gap-8">
                    <nav className="hidden md:flex items-center gap-8">
                        {['Dashboard', 'Recipes & BOM', 'Inventory', 'Suppliers'].map((item, i) => (
                            <a key={item} href="#" className={`text-sm transition-colors ${i === 1 ? 'text-primary font-semibold border-b-2 border-primary py-1' : 'text-slate-600 dark:text-slate-400 hover:text-primary font-medium'}`}>{item}</a>
                        ))}
                    </nav>
                    <div className="flex items-center gap-4">
                        <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700" />
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-6 flex flex-col">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold leading-tight">Recipe &amp; BOM Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage product configurations, ingredients, and costs.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm">
                            <span className="material-symbols-outlined text-sm">history</span>Version History
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm">
                            <span className="material-symbols-outlined text-sm">add</span>Create Product
                        </button>
                    </div>
                </div>

                {/* Split Panel */}
                <div className="flex flex-col lg:flex-row gap-6 items-stretch" style={{ minHeight: 600 }}>
                    {/* Left: Recipe List */}
                    <div className="w-full lg:w-1/3 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <span className="material-symbols-outlined">search</span>
                                </div>
                                <input className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors" placeholder="Search recipes or products..." type="search" />
                            </div>
                            <div className="flex gap-2 mt-3">
                                {['All', 'Finished', 'Semi-Finished'].map((f, i) => (
                                    <span key={f} className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${i === 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'} transition-colors`}>{f}</span>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                            {recipes.map((r, i) => (
                                <div
                                    key={r.name}
                                    onClick={() => setActive(i)}
                                    className={`flex items-center p-4 cursor-pointer border-l-4 transition-colors ${i === active ? 'bg-primary/5 dark:bg-primary/10 border-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'}`}
                                >
                                    <div className="flex-shrink-0 mr-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${i === active ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                            <span className="material-symbols-outlined">{r.icon}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm truncate ${i === active ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium'}`}>{r.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{r.type} • Yield: {r.yield}</p>
                                    </div>
                                    <div className="flex flex-col items-end ml-2">
                                        <span className="text-sm font-medium">{r.cost}</span>
                                        <span className={`text-xs mt-0.5 ${i === active ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>Cost</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Detail */}
                    <div className="w-full lg:w-2/3 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary shadow-inner">
                                    <span className="material-symbols-outlined text-3xl">{recipes[active].icon}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-2xl font-bold">{recipes[active].name}</h2>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">v1.4</span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{recipes[active].type} • Category: Mains</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><span className="material-symbols-outlined">edit</span></button>
                                <button className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><span className="material-symbols-outlined">more_vert</span></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Cost Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'Est. Cost', value: '$3.45', sub: 'per portion', highlight: false },
                                    { label: 'Selling Price', value: '$12.99', sub: 'target', highlight: false },
                                    { label: 'Gross Margin', value: '73.4%', sub: 'Healthy', highlight: true },
                                    { label: 'Wastage Factor', value: '5%', sub: 'Global setting', highlight: false },
                                ].map(({ label, value, sub, highlight }) => (
                                    <div key={label} className={`p-4 rounded-xl border flex flex-col relative overflow-hidden ${highlight ? 'border-primary/20 bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30'}`}>
                                        {highlight && <div className="absolute right-0 top-0 opacity-10 text-primary p-2"><span className="material-symbols-outlined text-4xl">trending_up</span></div>}
                                        <span className={`text-xs font-medium uppercase tracking-wider ${highlight ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
                                        <span className={`text-2xl font-bold mt-1 ${highlight ? 'text-primary' : ''}`}>{value}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</span>
                                    </div>
                                ))}
                            </div>

                            {/* BOM Table */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-slate-400">format_list_bulleted</span>Bill of Materials
                                    </h3>
                                    <button className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[18px]">add</span>Add Ingredient
                                    </button>
                                </div>
                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                                            <tr>
                                                {['Ingredient / Semi-Finished', 'Quantity', 'Unit', 'Est. Cost'].map((h, i) => (
                                                    <th key={h} className={`px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                                            {bom.map(({ icon, type, name, qty, unit, cost }) => (
                                                <tr key={name}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-2">
                                                        <span className={`material-symbols-outlined text-[18px] ${type === 'link' ? 'text-primary' : 'text-slate-400'}`}>{icon}</span>
                                                        {name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-right">{qty}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-right">{unit}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{cost}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 dark:bg-slate-800/30">
                                            <tr>
                                                <th className="px-6 py-3 text-right text-sm font-semibold" colSpan="3">Subtotal Cost:</th>
                                                <td className="px-6 py-3 text-right text-sm font-semibold">$3.00</td>
                                            </tr>
                                            <tr>
                                                <th className="px-6 py-3 text-right text-sm font-medium text-slate-500 dark:text-slate-400" colSpan="3">Wastage (5%) + Labor Alloc.:</th>
                                                <td className="px-6 py-3 text-right text-sm font-medium text-slate-500 dark:text-slate-400">+$0.45</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Steps */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400">blender</span>Production Steps
                                </h3>
                                <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-3 space-y-6">
                                    {steps.map(({ n, title, desc }) => (
                                        <li key={n} className="pl-6">
                                            <span className="absolute flex items-center justify-center w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full -left-3 ring-4 ring-white dark:ring-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300">{n}</span>
                                            <h4 className="font-medium mb-1">{title}</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm font-medium">Cancel</button>
                            <button className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm">Save Recipe Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
