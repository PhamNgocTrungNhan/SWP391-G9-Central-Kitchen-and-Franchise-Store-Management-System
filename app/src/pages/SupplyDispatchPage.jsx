import { useMemo } from 'react'
import { MetricsStrip } from '../components/ui'

const orders = [
    { id: '#ORD-9021', priority: 'High Priority', priorityStyle: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', time: '08:30 AM', store: 'Store 12 (Downtown)', pallets: '14 Pallets', type: 'Cold Storage', zone: 'Central' },
    { id: '#ORD-9023', priority: 'High Priority', priorityStyle: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', time: '09:15 AM', store: 'Store 05 (East Side)', pallets: '8 Pallets', type: 'Ambient', zone: 'East' },
    { id: '#ORD-9022', priority: 'Medium', priorityStyle: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', time: '10:00 AM', store: 'Store 08 (North Hills)', pallets: '12 Pallets', type: 'Mixed', zone: 'North' },
    { id: '#ORD-9024', priority: 'Low', priorityStyle: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', time: '11:30 AM', store: 'Store 15 (West Valley)', pallets: '5 Pallets', type: 'Ambient', zone: 'West', faded: true },
]

const fleet = [
    { name: 'Heavy Truck A', capacity: '20 Pallets (Refrigerated)', driver: 'Mike J.', status: 'Available', statusStyle: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', bar: 'bg-green-500', content: null },
    { name: 'Van 3', capacity: '8 Pallets (Mixed)', driver: 'Sarah W.', status: 'Loading', statusStyle: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', bar: 'bg-amber-500', content: { order: '#ORD-9018', route: 'East' } },
    { name: 'Heavy Truck B', capacity: '20 Pallets (Refrigerated)', driver: 'Dave L. • ETA: 2h 15m', status: 'In Transit', statusStyle: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', bar: 'bg-blue-500', content: { order: '#ORD-9015', route: 'North' }, faded: true },
]

export default function SupplyDispatchPage() {
    const statsItems = useMemo(() => {
        const pendingOrders = orders.length
        const highPriorityOrders = orders.filter((item) => String(item.priority || '').toLowerCase().includes('high')).length
        const availableFleet = fleet.filter((item) => String(item.status || '').toLowerCase() === 'available').length
        const activeRoutes = fleet.filter((item) => item.content).length

        return [
            {
                key: 'dispatch-pending',
                label: 'Đơn chờ điều phối',
                value: Number(pendingOrders || 0).toLocaleString('vi-VN'),
                note: `${highPriorityOrders} đơn ưu tiên cao`,
                icon: 'assignment',
                tone: 'blue',
            },
            {
                key: 'dispatch-fleet-available',
                label: 'Xe khả dụng',
                value: Number(availableFleet || 0).toLocaleString('vi-VN'),
                note: 'Sẵn sàng nhận lệnh',
                icon: 'local_shipping',
                tone: 'green',
            },
            {
                key: 'dispatch-active-routes',
                label: 'Tuyến đang chạy',
                value: Number(activeRoutes || 0).toLocaleString('vi-VN'),
                note: 'Đơn đã gán xe',
                icon: 'route',
                tone: 'purple',
            },
        ]
    }, [])

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-10 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4 text-primary">
                        <span className="material-symbols-outlined text-2xl">local_shipping</span>
                        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">LogiChain Connect</h2>
                    </div>
                    <nav className="flex items-center gap-9">
                        {['Dashboard', 'Orders', 'Logistics', 'Kitchen', 'Stores'].map((item, i) => (
                            <a key={item} href="#" className={`text-sm font-medium leading-normal transition-colors ${i === 2 ? 'text-primary border-b-2 border-primary pb-1' : 'text-slate-600 dark:text-slate-300 hover:text-primary'}`}>{item}</a>
                        ))}
                    </nav>
                </div>
                <div className="flex flex-1 justify-end gap-8 items-center">
                    <div className="flex w-full flex-1 items-stretch rounded-lg h-10 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 max-w-64">
                        <div className="text-slate-400 dark:text-slate-500 flex items-center justify-center pl-3">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </div>
                        <input className="form-input flex w-full min-w-0 flex-1 resize-none bg-transparent border-none text-slate-900 dark:text-white focus:outline-0 focus:ring-0 h-full placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 text-sm" placeholder="Search orders, routes..." />
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="relative text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-0 right-0 size-2 bg-red-500 rounded-full" />
                        </button>
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border border-slate-200 dark:border-slate-700 bg-slate-300 dark:bg-slate-700" />
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full p-6 gap-6">
                <div className="flex flex-wrap justify-between items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold leading-tight tracking-tight">Dispatch Operations</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Central Kitchen → Franchise Distribution Network</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors">
                            <span className="material-symbols-outlined text-[20px]">calendar_today</span>Today, Oct 24
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 text-sm font-medium transition-colors shadow-sm shadow-primary/20">
                            <span className="material-symbols-outlined text-[20px]">add</span>New Route
                        </button>
                    </div>
                </div>

                <MetricsStrip items={statsItems} columns="sm:grid-cols-3" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[600px]">
                    {/* Orders Queue */}
                    <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-semibold">Orders Queue</h3>
                                <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">12 Pending</span>
                            </div>
                            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
                                <button className="text-primary dark:text-primary border-b-2 border-primary pb-2 text-sm font-semibold tracking-wide">Ready for Dispatch</button>
                                <button className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 pb-2 text-sm font-medium tracking-wide transition-colors">Scheduled</button>
                            </div>
                            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
                                {['All Zones', 'North', 'South', 'East'].map((zone, i) => (
                                    <button key={zone} className={`flex shrink-0 items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium ${i === 0 ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{zone}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {orders.map(ord => (
                                <div key={ord.id} className={`group border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${ord.faded ? 'opacity-70' : ''}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-[20px] cursor-grab">drag_indicator</span>
                                            <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">{ord.id}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ord.priorityStyle}`}>{ord.priority}</span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-medium">{ord.time}</span>
                                    </div>
                                    <div className="pl-7">
                                        <h4 className="text-sm font-semibold mb-1">{ord.store}</h4>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">inventory_2</span>{ord.pallets}</span>
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">ac_unit</span>{ord.type}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-2">
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Zone: {ord.zone}</span>
                                            <button className="text-primary text-xs font-semibold hover:underline">Assign to Fleet</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Map + Fleet */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
                        {/* Map */}
                        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-sm min-h-[300px]">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-slate-400 dark:text-slate-600 flex flex-col items-center gap-2">
                                    <span className="material-symbols-outlined text-6xl">map</span>
                                    <span className="text-sm font-medium">Live Route Map</span>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 flex flex-col gap-2">
                                {['my_location', 'layers'].map(icon => (
                                    <button key={icon} className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined">{icon}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg">
                                <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider">Active Routes</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-slate-700 dark:text-slate-300">Truck A - North Route (In Transit)</span></div>
                                    <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-slate-700 dark:text-slate-300">Van 3 - East Route (Loading)</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Fleet */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-base font-semibold">Fleet Availability</h3>
                                <button className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                                    View Full Schedule <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {fleet.map(v => (
                                    <div key={v.name} className={`border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-2 relative overflow-hidden ${v.faded ? 'opacity-75' : 'group'}`}>
                                        <div className={`absolute top-0 right-0 w-1.5 h-full ${v.bar}`} />
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">local_shipping</span>
                                                <h4 className="text-sm font-semibold">{v.name}</h4>
                                            </div>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${v.statusStyle}`}>{v.status}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-1">
                                            <p>Capacity: {v.capacity}</p>
                                            <p>Driver: {v.driver}</p>
                                        </div>
                                        <div className="mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                                            {v.content ? (
                                                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                    <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">{v.content.order}</span>
                                                    <span className="text-xs text-slate-500">Route: {v.content.route}</span>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-200 dark:bg-slate-700 h-10 rounded border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 group-hover:bg-primary/5 group-hover:border-primary/30 transition-colors">
                                                    Drop Order Here to Assign
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
