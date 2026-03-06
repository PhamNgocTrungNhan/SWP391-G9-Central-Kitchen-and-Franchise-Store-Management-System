import { useState } from 'react'

const incomingOrders = [
    { id: '#ORD-2041', store: 'FR-042 – Downtown Express', date: 'Mar 04, 2026 09:15', items: [{ name: 'All-Purpose Flour', qty: 50, unit: 'kg' }, { name: 'Pizza Dough Base', qty: 20, unit: 'kg' }], status: 'New', priority: 'High', issue: null },
    { id: '#ORD-2040', store: 'FR-015 – Uptown Market', date: 'Mar 04, 2026 08:30', items: [{ name: 'Mozzarella Cheese', qty: 15, unit: 'kg' }, { name: 'Tomato Sauce Base', qty: 40, unit: 'L' }], status: 'Processing', priority: 'Medium', issue: null },
    { id: '#ORD-2039', store: 'FR-028 – West Side Café', date: 'Mar 03, 2026 17:00', items: [{ name: 'House Burger Sauce', qty: 30, unit: 'L' }], status: 'Ready', priority: 'Medium', issue: null },
    { id: '#ORD-2037', store: 'FR-007 – Airport T.C', date: 'Mar 03, 2026 14:20', items: [{ name: 'Fresh Basil Leaves', qty: 10, unit: 'bunch' }], status: 'Issue', priority: 'High', issue: 'Thiếu hàng: Fresh Basil Leaves (chỉ còn 3/10 bunches). Cần xác nhận từ cửa hàng.' },
    { id: '#ORD-2035', store: 'FR-033 – Mall Central', date: 'Mar 02, 2026 10:00', items: [{ name: 'All-Purpose Flour', qty: 100, unit: 'kg' }, { name: 'Mozzarella Cheese', qty: 20, unit: 'kg' }], status: 'Dispatched', priority: 'Low', issue: null },
]

const statusConfig = {
    New: { style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Mới' },
    Processing: { style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Đang xử lý' },
    Ready: { style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Sẵn sàng' },
    Dispatched: { style: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', label: 'Đã giao' },
    Issue: { style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: '⚠ Sự cố' },
}

const priorityStyle = { High: 'text-red-600 dark:text-red-400', Medium: 'text-amber-600 dark:text-amber-400', Low: 'text-slate-400' }

export default function OrderManagementPage() {
    const [filter, setFilter] = useState('All')
    const [expandedId, setExpandedId] = useState(null)

    const filters = ['All', 'New', 'Processing', 'Ready', 'Issue']
    const filtered = filter === 'All' ? incomingOrders : incomingOrders.filter(o => o.status === filter)
    const issues = incomingOrders.filter(o => o.status === 'Issue')

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">restaurant_menu</span>
                    <h2 className="text-lg font-bold leading-tight">Central Kitchen — Quản Lý Đơn Hàng</h2>
                </div>
                <div className="flex flex-1 justify-end gap-4 items-center">
                    <button className="relative text-slate-500 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                        {issues.length > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{issues.length}</span>}
                    </button>
                    <div className="bg-slate-200 dark:bg-slate-700 rounded-full size-9" />
                </div>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
                {/* Page Header */}
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Đơn Hàng Từ Các Cửa Hàng</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Tiếp nhận, xử lý và theo dõi đơn đặt hàng từ franchise. Xử lý các sự cố phát sinh.</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">download</span>Xuất báo cáo
                        </button>
                        <button className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">refresh</span>Làm mới
                        </button>
                    </div>
                </div>

                {/* Issue Alert Banner */}
                {issues.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                        <span className="material-symbols-outlined text-red-500 text-2xl mt-0.5">warning</span>
                        <div className="flex-1">
                            <p className="font-semibold text-red-700 dark:text-red-400">{issues.length} sự cố cần xử lý</p>
                            {issues.map(o => (
                                <div key={o.id} className="mt-2 text-sm">
                                    <span className="font-medium text-red-600 dark:text-red-400">{o.id} — {o.store}:</span>
                                    <span className="text-red-600 dark:text-red-400 ml-1">{o.issue}</span>
                                    <div className="flex gap-2 mt-2">
                                        <button className="h-7 px-3 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors">Xử lý sự cố</button>
                                        <button className="h-7 px-3 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">Liên hệ cửa hàng</button>
                                        <button className="h-7 px-3 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">Hủy đơn</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Đơn mới', value: incomingOrders.filter(o => o.status === 'New').length, color: 'text-blue-600 dark:text-blue-400', icon: 'inbox' },
                        { label: 'Đang xử lý', value: incomingOrders.filter(o => o.status === 'Processing').length, color: 'text-amber-600 dark:text-amber-400', icon: 'precision_manufacturing' },
                        { label: 'Sẵn sàng xuất', value: incomingOrders.filter(o => o.status === 'Ready').length, color: 'text-emerald-600 dark:text-emerald-400', icon: 'inventory' },
                        { label: 'Sự cố', value: issues.length, color: 'text-red-600 dark:text-red-400', icon: 'warning' },
                    ].map(({ label, value, color, icon }) => (
                        <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3 shadow-sm">
                            <span className={`material-symbols-outlined text-2xl ${color}`}>{icon}</span>
                            <div>
                                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {filters.map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`flex shrink-0 items-center px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filter === f ? 'bg-primary text-white border-primary' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            {f === 'All' ? 'Tất cả' : statusConfig[f]?.label || f}
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                {f === 'All' ? incomingOrders.length : incomingOrders.filter(o => o.status === f).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Orders List */}
                <div className="flex flex-col gap-3">
                    {filtered.map(order => (
                        <div key={order.id} className={`bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden transition-all ${order.status === 'Issue' ? 'border-red-200 dark:border-red-800' : 'border-slate-200 dark:border-slate-800'}`}>
                            <div
                                className="p-4 flex items-center justify-between flex-wrap gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold">{order.id}</span>
                                            <span className={`text-[10px] font-bold ${priorityStyle[order.priority]}`}>● {order.priority}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{order.store}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{order.date} • {order.items.length} mặt hàng</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusConfig[order.status]?.style}`}>
                                        {statusConfig[order.status]?.label}
                                    </span>
                                    <span className="material-symbols-outlined text-slate-400 text-[20px] transition-transform" style={{ transform: expandedId === order.id ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                                </div>
                            </div>

                            {expandedId === order.id && (
                                <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/20">
                                    <h4 className="text-sm font-semibold mb-3">Danh sách hàng hóa:</h4>
                                    <div className="flex flex-col gap-2 mb-4">
                                        {order.items.map(item => (
                                            <div key={item.name} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                <span className="text-sm">{item.name}</span>
                                                <span className="text-sm font-medium">{item.qty} {item.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {order.issue && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-start gap-2">
                                            <span className="material-symbols-outlined text-red-500 text-lg mt-0.5">error</span>
                                            <p className="text-sm text-red-700 dark:text-red-400">{order.issue}</p>
                                        </div>
                                    )}
                                    <div className="flex gap-2 flex-wrap">
                                        {order.status === 'New' && (
                                            <button className="h-8 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors">✓ Chấp nhận & Bắt đầu xử lý</button>
                                        )}
                                        {order.status === 'Processing' && (
                                            <button className="h-8 px-4 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors">✓ Hoàn thành – Xuất kho</button>
                                        )}
                                        {order.status === 'Ready' && (
                                            <button className="h-8 px-4 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors">🚚 Bàn giao vận chuyển</button>
                                        )}
                                        {order.status === 'Issue' && (
                                            <>
                                                <button className="h-8 px-4 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors">Xử lý một phần – Thông báo CK</button>
                                                <button className="h-8 px-4 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Hủy đơn</button>
                                            </>
                                        )}
                                        <button className="h-8 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-white dark:hover:bg-slate-800 transition-colors">Ghi chú</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
