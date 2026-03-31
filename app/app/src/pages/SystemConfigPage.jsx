import { useState } from 'react'

const sections = [
    { key: 'units', icon: 'straighten', label: 'Đơn Vị Tính', desc: 'Quản lý đơn vị đo lường trong hệ thống' },
    { key: 'workflow', icon: 'account_tree', label: 'Quy Trình Vận Hành', desc: 'Cấu hình luồng xử lý đơn hàng và sản xuất' },
    { key: 'params', icon: 'tune', label: 'Tham Số Hệ Thống', desc: 'Cài đặt giới hạn, thời gian và ngưỡng cảnh báo' },
    { key: 'notifications', icon: 'notifications_active', label: 'Thông Báo', desc: 'Cấu hình kênh và loại thông báo' },
    { key: 'integrations', icon: 'integration_instructions', label: 'Tích Hợp', desc: 'Kết nối API và dịch vụ bên ngoài' },
]

const units = [
    { id: 1, name: 'Kilogram', symbol: 'kg', type: 'Khối lượng' },
    { id: 2, name: 'Gram', symbol: 'g', type: 'Khối lượng' },
    { id: 3, name: 'Lít', symbol: 'L', type: 'Thể tích' },
    { id: 4, name: 'Mililit', symbol: 'ml', type: 'Thể tích' },
    { id: 5, name: 'Cái / Chiếc', symbol: 'pc', type: 'Số đếm' },
    { id: 6, name: 'Bó', symbol: 'bunch', type: 'Số đếm' },
]

const workflowOptions = [
    { label: 'Yêu cầu xác nhận kép khi xuất kho', enabled: true },
    { label: 'Tự động phân loại đơn hàng theo vùng', enabled: true },
    { label: 'Cho phép cửa hàng hủy đơn sau 1 giờ', enabled: false },
    { label: 'Cảnh báo sự cố trước khi xử lý đơn', enabled: true },
    { label: 'Gửi xác nhận email khi đơn thay đổi trạng thái', enabled: false },
]

const params = [
    { label: 'Ngưỡng tồn kho tối thiểu cảnh báo (%)', value: '25', unit: '%' },
    { label: 'Thời gian xử lý đơn tối đa', value: '4', unit: 'giờ' },
    { label: 'Thời gian giao hàng chuẩn', value: '120', unit: 'phút' },
    { label: 'Hệ số hao hụt sản xuất mặc định', value: '5', unit: '%' },
    { label: 'Số ngày cảnh báo trước khi hết hạn', value: '7', unit: 'ngày' },
]

function Toggle({ defaultOn }) {
    const [on, setOn] = useState(defaultOn)
    return (
        <button onClick={() => setOn(v => !v)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${on ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    )
}

export default function SystemConfigPage() {
    const [activeSection, setActiveSection] = useState('units')
    const [showAddUnit, setShowAddUnit] = useState(false)

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">restaurant_menu</span>
                    <h2 className="text-lg font-bold leading-tight">Admin — Cấu Hình Hệ Thống</h2>
                </div>
                <div className="flex flex-1 justify-end gap-4 items-center">
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">Administrator</span>
                    <div className="bg-slate-200 dark:bg-slate-700 rounded-full size-9" />
                </div>
            </header>

            <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 gap-6">
                {/* Left Nav */}
                <aside className="w-64 flex-shrink-0 hidden lg:flex flex-col gap-1">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cài Đặt Hệ Thống</h3>
                    {sections.map(({ key, icon, label, desc }) => (
                        <button
                            key={key}
                            onClick={() => setActiveSection(key)}
                            className={`flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-colors w-full ${activeSection === key ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <span className="material-symbols-outlined mt-0.5">{icon}</span>
                            <div>
                                <p className="text-sm font-medium">{label}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{desc}</p>
                            </div>
                        </button>
                    ))}
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col gap-6 min-w-0">
                    {activeSection === 'units' && (
                        <>
                            <div className="flex justify-between items-center">
                                <div>
                                    <h1 className="text-2xl font-bold">Đơn Vị Tính</h1>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quản lý các đơn vị đo lường sử dụng trong hệ thống.</p>
                                </div>
                                <button onClick={() => setShowAddUnit(v => !v)} className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">add</span>Thêm đơn vị
                                </button>
                            </div>

                            {showAddUnit && (
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-primary/30 p-5 shadow-sm">
                                    <h3 className="font-semibold mb-4">Thêm Đơn Vị Mới</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tên đơn vị</label>
                                            <input className="form-input rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none" placeholder="VD: Thùng" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Ký hiệu</label>
                                            <input className="form-input rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none" placeholder="VD: thùng" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Loại</label>
                                            <select className="form-select rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-transparent text-sm px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none">
                                                <option>Số đếm</option>
                                                <option>Khối lượng</option>
                                                <option>Thể tích</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button className="h-8 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors">Lưu</button>
                                        <button onClick={() => setShowAddUnit(false)} className="h-8 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Hủy</button>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                            {['#', 'Tên đơn vị', 'Ký hiệu', 'Loại', 'Hành động'].map(h => (
                                                <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {units.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-5 py-3 text-sm text-slate-400">{u.id}</td>
                                                <td className="px-5 py-3 font-medium text-sm">{u.name}</td>
                                                <td className="px-5 py-3"><code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">{u.symbol}</code></td>
                                                <td className="px-5 py-3"><span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">{u.type}</span></td>
                                                <td className="px-5 py-3">
                                                    <button className="text-slate-400 hover:text-primary transition-colors p-1"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                    <button className="text-slate-400 hover:text-red-500 transition-colors p-1 ml-1"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {activeSection === 'workflow' && (
                        <>
                            <div>
                                <h1 className="text-2xl font-bold">Quy Trình Vận Hành</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Bật/tắt các bước trong luồng xử lý đơn hàng và sản xuất.</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                                {workflowOptions.map(({ label, enabled }) => (
                                    <div key={label} className="flex items-center justify-between px-5 py-4">
                                        <p className="text-sm font-medium">{label}</p>
                                        <Toggle defaultOn={enabled} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end">
                                <button className="h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">Lưu Cấu Hình</button>
                            </div>
                        </>
                    )}

                    {activeSection === 'params' && (
                        <>
                            <div>
                                <h1 className="text-2xl font-bold">Tham Số Hệ Thống</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Chỉnh các ngưỡng, thời gian, và giới hạn vận hành.</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                                {params.map(({ label, value, unit: u }) => (
                                    <div key={label} className="flex items-center justify-between px-5 py-4 gap-4">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{label}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <input defaultValue={value} className="w-20 text-right px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none" />
                                            <span className="text-sm text-slate-500 w-10">{u}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end">
                                <button className="h-10 px-5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">Lưu Tham Số</button>
                            </div>
                        </>
                    )}

                    {(activeSection === 'notifications' || activeSection === 'integrations') && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center gap-4 text-center shadow-sm">
                            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
                                {sections.find(s => s.key === activeSection)?.icon}
                            </span>
                            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                                {sections.find(s => s.key === activeSection)?.label}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Tính năng đang được phát triển.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
