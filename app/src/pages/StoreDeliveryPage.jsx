import { useMemo } from 'react'
import { MetricsStrip } from '../components/ui'

const deliveryItems = [
    { name: 'Fresh Basil Leaves (1kg)', ordered: 5, received: 5, stars: 5, note: '', variant: 'normal' },
    { name: 'Premium Pizza Flour (25kg)', ordered: 10, received: 10, stars: 4, note: '', variant: 'normal' },
    { name: 'Mozzarella Cheese (5kg block)', ordered: 8, received: 7, stars: 2, note: 'One block damaged in transit', variant: 'error' },
    { name: 'Tomato Sauce Base (10L)', ordered: 4, received: 4, stars: 5, note: '', variant: 'normal' },
]

function StarRating({ count }) {
    return (
        <div className="flex gap-1 text-amber-400">
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`material-symbols-outlined text-lg cursor-pointer ${i > count ? 'text-slate-300 dark:text-slate-700' : ''}`}>star</span>
            ))}
        </div>
    )
}

export default function StoreDeliveryPage() {
    const statsItems = useMemo(() => {
        const totalItems = deliveryItems.length
        const totalOrdered = deliveryItems.reduce((sum, item) => sum + Number(item.ordered || 0), 0)
        const totalReceived = deliveryItems.reduce((sum, item) => sum + Number(item.received || 0), 0)
        const avgRating = totalItems > 0
            ? deliveryItems.reduce((sum, item) => sum + Number(item.stars || 0), 0) / totalItems
            : 0
        const issueCount = deliveryItems.filter((item) => Number(item.received || 0) < Number(item.ordered || 0) || String(item.note || '').trim()).length

        return [
            {
                key: 'delivery-items',
                label: 'Mặt hàng nhận',
                value: Number(totalItems || 0).toLocaleString('vi-VN'),
                note: 'Số dòng giao nhận',
                icon: 'inventory_2',
                tone: 'blue',
            },
            {
                key: 'delivery-received-rate',
                label: 'Tỷ lệ nhận',
                value: `${totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0}%`,
                note: `${totalReceived}/${totalOrdered} đơn vị`,
                icon: 'local_shipping',
                tone: 'green',
            },
            {
                key: 'delivery-quality',
                label: 'Chất lượng TB',
                value: `${avgRating.toFixed(1)}/5`,
                note: 'Điểm đánh giá toàn lô',
                icon: 'star',
                tone: 'amber',
            },
            {
                key: 'delivery-issues',
                label: 'Dòng có vấn đề',
                value: Number(issueCount || 0).toLocaleString('vi-VN'),
                note: 'Thiếu hàng hoặc có ghi chú',
                icon: 'warning',
                tone: issueCount > 0 ? 'red' : 'green',
            },
        ]
    }, [])

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <div className="flex h-full grow flex-col">
                <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
                    <div className="flex flex-col max-w-[960px] flex-1">
                        {/* Header */}
                        <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-10 py-3 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="size-6 text-primary flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[24px]">kitchen</span>
                                </div>
                                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Central Kitchen Mgmt</h2>
                            </div>
                            <div className="flex flex-1 justify-end gap-8">
                                <div className="flex items-center gap-9">
                                    {['Dashboard', 'Orders', 'Deliveries', 'Inventory'].map((item, i) => (
                                        <a key={item} href="#" className={`text-sm font-medium transition-colors ${i === 2 ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-primary'}`}>{item}</a>
                                    ))}
                                </div>
                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-slate-300 dark:bg-slate-700 rounded-full" />
                            </div>
                        </header>

                        {/* Page Title */}
                        <div className="flex flex-wrap justify-between gap-3 px-4 pb-4">
                            <div className="flex min-w-72 flex-col gap-2">
                                <h1 className="text-[32px] font-bold leading-tight">Goods Receipt &amp; Quality Feedback</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Review delivery #DEL-9082 against ordered quantities and provide quality feedback.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 text-sm font-medium transition-colors">Save Draft</button>
                                <button className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white hover:bg-primary/90 text-sm font-medium transition-colors">Submit Receipt</button>
                            </div>
                        </div>

                        <div className="px-4 pb-4">
                            <MetricsStrip items={statsItems} columns="sm:grid-cols-2 xl:grid-cols-4" />
                        </div>

                        {/* Table */}
                        <div className="px-4 py-3">
                            <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                                <table className="flex-1 w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                            <th className="px-4 py-3 w-[250px] text-sm font-semibold text-slate-700 dark:text-slate-300">Item Description</th>
                                            <th className="px-4 py-3 w-24 text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">Ordered</th>
                                            <th className="px-4 py-3 w-32 text-sm font-semibold text-slate-700 dark:text-slate-300">Received</th>
                                            <th className="px-4 py-3 w-40 text-sm font-semibold text-slate-700 dark:text-slate-300">Quality Rating</th>
                                            <th className="px-4 py-3 w-32 text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">Photo</th>
                                            <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {deliveryItems.map((item) => (
                                            <tr key={item.name} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${item.variant === 'error' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                                <td className="px-4 py-4 text-sm font-medium">{item.name}</td>
                                                <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 text-center">{item.ordered}</td>
                                                <td className="px-4 py-4">
                                                    <input
                                                        className={`w-20 px-2 py-1.5 rounded border text-sm focus:ring-1 focus:outline-none ${item.variant === 'error' ? 'border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-700 bg-transparent focus:ring-primary focus:border-primary'}`}
                                                        defaultValue={item.received}
                                                        min="0"
                                                        type="number"
                                                    />
                                                </td>
                                                <td className="px-4 py-4"><StarRating count={item.stars} /></td>
                                                <td className="px-4 py-4 text-center">
                                                    {item.variant === 'error' ? (
                                                        <button className="text-primary flex items-center justify-center w-full gap-1">
                                                            <span className="material-symbols-outlined text-xl">image</span>
                                                            <span className="text-xs font-medium">1</span>
                                                        </button>
                                                    ) : (
                                                        <button className="text-slate-400 hover:text-primary transition-colors flex items-center justify-center w-full">
                                                            <span className="material-symbols-outlined text-xl">add_a_photo</span>
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <input
                                                        className={`w-full px-3 py-1.5 rounded border text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none ${item.variant === 'error' ? 'border-red-300 dark:border-red-700/50 bg-transparent text-red-600 dark:text-red-400' : 'border-slate-300 dark:border-slate-700 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-600'}`}
                                                        defaultValue={item.note}
                                                        placeholder="Add note..."
                                                        type="text"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 py-6">
                            <div className="flex flex-col gap-3">
                                <h2 className="text-[18px] font-semibold leading-tight tracking-[-0.015em]">Additional Comments</h2>
                                <textarea
                                    className="flex w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-0 focus:ring-1 focus:ring-primary focus:border-primary min-h-[140px] placeholder:text-slate-400 dark:placeholder:text-slate-500 p-4 text-sm leading-normal shadow-sm"
                                    placeholder="Enter any general feedback about the delivery, driver behavior, or overall quality..."
                                />
                            </div>
                            <div className="flex flex-col gap-3">
                                <h2 className="text-[18px] font-semibold leading-tight tracking-[-0.015em] flex justify-between items-center">
                                    Receiver Signature
                                    <button className="text-xs text-slate-500 hover:text-primary transition-colors flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">clear</span>Clear
                                    </button>
                                </h2>
                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 h-[140px] relative shadow-sm flex items-center justify-center cursor-crosshair">
                                    <span className="text-slate-300 dark:text-slate-700 text-sm italic absolute select-none pointer-events-none">Sign here</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
