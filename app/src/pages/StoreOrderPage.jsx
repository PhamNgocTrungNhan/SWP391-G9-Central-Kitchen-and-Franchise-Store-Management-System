import { useState } from 'react'

const storeInventory = [
    { name: 'All-Purpose Flour', unit: 'kg', stock: 45, min: 20, icon: 'grain', status: 'ok' },
    { name: 'Fresh Tomatoes', unit: 'kg', stock: 8, min: 15, icon: 'eco', status: 'low' },
    { name: 'Mozzarella Cheese', unit: 'kg', stock: 3, min: 10, icon: 'kitchen', status: 'critical' },
    { name: 'Tomato Sauce Base', unit: 'L', stock: 22, min: 10, icon: 'soup_kitchen', status: 'ok' },
    { name: 'Pizza Dough Base', unit: 'kg', stock: 12, min: 15, icon: 'bakery_dining', status: 'low' },
]

const myOrders = [
    { id: '#ORD-2041', date: 'Mar 04, 2026', items: 5, status: 'Delivered', statusStyle: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { id: '#ORD-2038', date: 'Mar 02, 2026', items: 3, status: 'In Transit', statusStyle: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { id: '#ORD-2035', date: 'Mar 01, 2026', items: 7, status: 'Processing', statusStyle: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { id: '#ORD-2030', date: 'Feb 27, 2026', items: 4, status: 'Pending', statusStyle: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
]

const catalog = [
    { name: 'All-Purpose Flour', unit: 'kg', price: '$1.20/kg', icon: 'grain' },
    { name: 'Fresh Basil Leaves', unit: 'bunch', price: '$0.80/bunch', icon: 'eco' },
    { name: 'Pizza Dough Base', unit: 'kg', price: '$2.50/kg', icon: 'bakery_dining' },
    { name: 'House Burger Sauce', unit: 'L', price: '$4.00/L', icon: 'soup_kitchen' },
    { name: 'Mozzarella Cheese', unit: 'kg', price: '$8.50/kg', icon: 'kitchen' },
    { name: 'Tomato Sauce Base', unit: 'L', price: '$3.20/L', icon: 'local_pizza' },
]

const statusColors = { ok: 'bg-emerald-500', low: 'bg-amber-500', critical: 'bg-red-500' }
const stockBg = { ok: '', low: 'bg-amber-50 dark:bg-amber-900/10', critical: 'bg-red-50 dark:bg-red-900/10' }

export default function StoreOrderPage() {
    const [tab, setTab] = useState(0) // 0=Place Order, 1=My Orders, 2=Store Inventory
    const [cart, setCart] = useState({})

    const addToCart = (name) => setCart(c => ({ ...c, [name]: (c[name] || 0) + 1 }))
    const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">storefront</span>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Store Staff Portal</h2>
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">Franchise #042 – Downtown Express</span>
                </div>
                <div className="flex flex-1 justify-end gap-6 items-center">
                    <nav className="hidden md:flex items-center gap-8">
                        {['Place Order', 'My Orders', 'Store Inventory'].map((item, i) => (
                            <button key={item} onClick={() => setTab(i)} className={`text-sm font-medium transition-colors ${i === tab ? 'text-primary font-semibold border-b-2 border-primary pb-1' : 'text-slate-600 dark:text-slate-400 hover:text-primary'}`}>{item}</button>
                        ))}
                    </nav>
                    <button className="relative text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <div className="bg-slate-200 dark:bg-slate-700 rounded-full size-9" />
                </div>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

                {/* TAB 0: Place Order */}
                {tab === 0 && (
                    <>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold">Đặt Hàng Từ Bếp Trung Tâm</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Chọn nguyên liệu hoặc bán thành phẩm cần bổ sung.</p>
                            </div>
                            {cartCount > 0 && (
                                <button className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
                                    <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                                    Xem Giỏ Hàng ({cartCount} sản phẩm)
                                </button>
                            )}
                        </div>

                        {/* Search bar */}
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none" placeholder="Tìm nguyên liệu, bán thành phẩm..." />
                        </div>

                        {/* Catalog Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {catalog.map(({ name, unit, price, icon }) => (
                                <div key={name} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined text-2xl">{icon}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Đơn vị: {unit}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-primary font-bold">{price}</span>
                                        <div className="flex items-center gap-2">
                                            {cart[name] > 0 && (
                                                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{cart[name]} {unit}</span>
                                            )}
                                            <button onClick={() => addToCart(name)} className="flex items-center gap-1 h-8 px-3 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">add</span>Thêm
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {cartCount > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                                <h3 className="font-semibold mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">shopping_cart</span>Đơn Hàng Của Bạn</h3>
                                <div className="flex flex-col gap-2 mb-4">
                                    {Object.entries(cart).filter(([, q]) => q > 0).map(([name, qty]) => {
                                        const item = catalog.find(c => c.name === name)
                                        return (
                                            <div key={name} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-sm font-medium">{name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-slate-500">{qty} {item?.unit}</span>
                                                    <button onClick={() => setCart(c => ({ ...c, [name]: Math.max(0, c[name] - 1) }))} className="text-slate-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[18px]">remove_circle</span></button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Lưu Nháp</button>
                                    <button className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm">
                                        <span className="material-symbols-outlined text-[16px] mr-1 align-middle">send</span>Gửi Đơn Đặt Hàng
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* TAB 1: My Orders */}
                {tab === 1 && (
                    <>
                        <div>
                            <h1 className="text-2xl font-bold">Đơn Hàng Của Tôi</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Theo dõi trạng thái xử lý và giao hàng của các đơn đặt.</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            {myOrders.map(order => (
                                <div key={order.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="font-bold text-base">{order.id}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{order.date} • {order.items} sản phẩm</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${order.statusStyle}`}>{order.status}</span>
                                            <button className="flex items-center gap-1 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">visibility</span>Chi Tiết
                                            </button>
                                            {order.status === 'In Transit' && (
                                                <button onClick={() => setTab(0)} className="flex items-center gap-1 h-8 px-3 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">fact_check</span>Xác Nhận Nhận Hàng
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {/* Order progress bar */}
                                    <div className="mt-4">
                                        <div className="flex items-center gap-1">
                                            {['Đã đặt', 'Đang xử lý', 'Xuất kho', 'Đang giao', 'Đã nhận'].map((step, i) => {
                                                const statusMap = { Pending: 0, Processing: 1, Processing: 2, 'In Transit': 3, Delivered: 4 }
                                                const activeStep = statusMap[order.status] ?? 0
                                                const done = i <= activeStep
                                                return (
                                                    <div key={step} className="flex-1 flex items-center">
                                                        <div className="flex flex-col items-center gap-1 flex-1">
                                                            <div className={`size-5 rounded-full flex items-center justify-center text-[10px] ${done ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                                                {done ? '✓' : i + 1}
                                                            </div>
                                                            <span className={`text-[9px] text-center leading-tight ${done ? 'text-primary font-medium' : 'text-slate-400'}`}>{step}</span>
                                                        </div>
                                                        {i < 4 && <div className={`h-0.5 flex-1 mx-1 ${done && i < activeStep ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* TAB 2: Store Inventory */}
                {tab === 2 && (
                    <>
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h1 className="text-2xl font-bold">Tồn Kho Cửa Hàng</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Xem tồn kho hiện tại và cảnh báo hàng sắp hết tại cửa hàng.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-800">
                                    <span className="size-1.5 rounded-full bg-red-500" />2 mặt hàng cần đặt ngay
                                </div>
                                <button onClick={() => setTab(0)} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>Đặt Thêm Hàng
                                </button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        {['Nguyên liệu / Bán thành phẩm', 'Tồn kho', 'Tối thiểu', 'Trạng thái', 'Hành động'].map(h => (
                                            <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {storeInventory.map(item => (
                                        <tr key={item.name} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${stockBg[item.status]}`}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-slate-400">{item.icon}</span>
                                                    <span className="font-medium text-sm">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`font-bold text-sm ${item.status === 'critical' ? 'text-red-600 dark:text-red-400' : item.status === 'low' ? 'text-amber-600 dark:text-amber-400' : ''}`}>{item.stock} {item.unit}</span>
                                                    <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                        <div className={`h-full rounded-full ${statusColors[item.status]}`} style={{ width: `${Math.min(100, (item.stock / (item.min * 2)) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{item.min} {item.unit}</td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : item.status === 'low' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                    <span className={`size-1.5 rounded-full ${statusColors[item.status]}`} />
                                                    {item.status === 'critical' ? 'Cần đặt ngay' : item.status === 'low' ? 'Sắp hết' : 'Đủ hàng'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {item.status !== 'ok' && (
                                                    <button onClick={() => setTab(0)} className="flex items-center gap-1 text-primary text-xs font-semibold hover:underline">
                                                        <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>Đặt thêm
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

            </div>
        </div>
    )
}
