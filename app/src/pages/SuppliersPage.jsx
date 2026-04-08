import { useEffect, useState, useMemo } from 'react'
import { MetricsStrip } from '../components/ui'

function parseArrayData(raw) {
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw?.items)) return raw.items
    if (Array.isArray(raw?.data)) return raw.data
    return []
}

function getToken() {
    const candidates = [
        localStorage.getItem('auth_token'),
        localStorage.getItem('token'),
        localStorage.getItem('access_token'),
        sessionStorage.getItem('auth_token'),
        sessionStorage.getItem('token'),
        sessionStorage.getItem('access_token'),
    ]
    const first = candidates.find((item) => String(item || '').trim())
    return first ? String(first).replace(/^Bearer\s+/i, '').trim() : ''
}

function normalizeSuppliers(raw) {
    return parseArrayData(raw)
        .map((item) => {
            const supplierId = Number(item?.supplierId ?? item?.id)
            if (!supplierId) return null
            return {
                supplierId,
                supplierName: item?.supplierName || item?.name || 'Nhà cung cấp chưa có tên',
                contactInfo: item?.contactInfo || 'Chưa có thông tin liên hệ',
                address: item?.address || 'Chưa có địa chỉ',
                isActive: item?.isActive !== false,
            }
        })
        .filter(Boolean)
}

export default function SuppliersPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

    const [loading, setLoading] = useState(false)
    const [suppliers, setSuppliers] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('create')
    const [editingSupplierId, setEditingSupplierId] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [notice, setNotice] = useState({ open: false, type: 'success', message: '' })
    const [form, setForm] = useState({
        supplierName: '',
        contactInfo: '',
        address: '',
        isActive: true,
    })

    const openNotice = (type, message) => setNotice({ open: true, type, message })
    const closeNotice = () => setNotice((prev) => ({ ...prev, open: false }))

    useEffect(() => {
        if (!notice.open) return undefined

        const timer = window.setTimeout(() => {
            setNotice((prev) => ({ ...prev, open: false }))
        }, 2800)

        return () => window.clearTimeout(timer)
    }, [notice.open, notice.message])

    const fetchSuppliers = async () => {
        const token = getToken()
        if (!token) {
            setSuppliers([])
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`${apiBase}/Suppliers`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể tải danh sách nhà cung cấp.')
            }

            setSuppliers(normalizeSuppliers(data))
        } catch (requestError) {
            setSuppliers([])
            openNotice('error', requestError.message || 'Tải dữ liệu nhà cung cấp thất bại.')
        } finally {
            setLoading(false)
        }
    }

    const openCreateModal = () => {
        setModalMode('create')
        setForm({
            supplierName: '',
            contactInfo: '',
            address: '',
            isActive: true,
        })
        setShowModal(true)
    }

    const openEditModal = (supplier) => {
        setModalMode('edit')
        setEditingSupplierId(supplier.supplierId)
        setForm({
            supplierName: supplier.supplierName,
            contactInfo: supplier.contactInfo === 'Chưa có thông tin liên hệ' ? '' : supplier.contactInfo,
            address: supplier.address === 'Chưa có địa chỉ' ? '' : supplier.address,
            isActive: Boolean(supplier.isActive),
        })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingSupplierId(null)
    }

    const createSupplier = async () => {
        const token = getToken()
        if (!token) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const supplierName = String(form.supplierName || '').trim()
        if (!supplierName) {
            openNotice('error', 'Vui lòng nhập tên nhà cung cấp.')
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`${apiBase}/Suppliers`, {
                method: 'POST',
                headers: {
                    accept: '*/*',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    supplierName,
                    contactInfo: String(form.contactInfo || '').trim(),
                    address: String(form.address || '').trim(),
                    isActive: Boolean(form.isActive),
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể thêm nhà cung cấp.')
            }

            openNotice('success', data?.message || 'Thêm nhà cung cấp thành công.')
            closeModal()
            await fetchSuppliers()
        } catch (requestError) {
            openNotice('error', requestError.message || 'Thêm nhà cung cấp thất bại.')
        } finally {
            setLoading(false)
        }
    }

    const updateSupplier = async () => {
        if (!editingSupplierId) {
            openNotice('error', 'Không tìm thấy nhà cung cấp cần cập nhật.')
            return
        }

        const token = getToken()
        if (!token) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        const supplierName = String(form.supplierName || '').trim()
        if (!supplierName) {
            openNotice('error', 'Vui lòng nhập tên nhà cung cấp.')
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`${apiBase}/Suppliers/${editingSupplierId}`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    supplierName,
                    contactInfo: String(form.contactInfo || '').trim(),
                    address: String(form.address || '').trim(),
                    isActive: Boolean(form.isActive),
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể cập nhật nhà cung cấp.')
            }

            openNotice('success', data?.message || 'Cập nhật nhà cung cấp thành công.')
            closeModal()
            await fetchSuppliers()
        } catch (requestError) {
            openNotice('error', requestError.message || 'Cập nhật nhà cung cấp thất bại.')
        } finally {
            setLoading(false)
        }
    }

    const stats = useMemo(() => ({
        total: suppliers.length,
        active: suppliers.filter((s) => s.isActive).length,
        inactive: suppliers.filter((s) => !s.isActive).length,
    }), [suppliers])

    const statsItems = [
        {
            key: 'supplier-total',
            label: 'Tổng nhà cung cấp',
            value: Number(stats.total || 0).toLocaleString('vi-VN'),
            icon: 'inventory_2',
            tone: 'blue',
        },
        {
            key: 'supplier-active',
            label: 'Đang hoạt động',
            value: Number(stats.active || 0).toLocaleString('vi-VN'),
            icon: 'check_circle',
            tone: 'emerald',
        },
        {
            key: 'supplier-inactive',
            label: 'Ngừng hoạt động',
            value: Number(stats.inactive || 0).toLocaleString('vi-VN'),
            icon: 'cancel',
            tone: 'red',
        },
    ]

    const filtered = useMemo(() => {
        let result = suppliers

        if (statusFilter === 'Active') {
            result = result.filter((s) => s.isActive)
        } else if (statusFilter === 'Inactive') {
            result = result.filter((s) => !s.isActive)
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase()
            result = result.filter((s) =>
                s.supplierName?.toLowerCase().includes(term) ||
                s.contactInfo?.toLowerCase().includes(term) ||
                s.address?.toLowerCase().includes(term)
            )
        }

        return result
    }, [suppliers, statusFilter, searchTerm])

    useEffect(() => {
        fetchSuppliers()
    }, [])

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">local_shipping</span>
                    <h2 className="text-lg font-bold leading-tight">Quản lý nhà cung cấp</h2>
                </div>
                <button
                    className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                    onClick={openCreateModal}
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>Thêm nhà cung cấp
                </button>
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold">Danh sách nhà cung cấp</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quản lý thông tin nhà cung cấp nguyên liệu và sản phẩm.</p>
                </div>

                <MetricsStrip items={statsItems} columns="sm:grid-cols-3" />

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Tìm kiếm</span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Tìm theo tên, liên hệ hoặc địa chỉ..."
                                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Lọc theo trạng thái</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="All">Tất cả</option>
                                <option value="Active">Đang hoạt động</option>
                                <option value="Inactive">Ngừng hoạt động</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    {loading ? <div className="px-4 py-3 text-sm text-slate-500">Đang tải dữ liệu...</div> : null}
                    {!loading && filtered.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">Không có nhà cung cấp phù hợp.</div> : null}

                    {!loading && filtered.length > 0 ? (
                        <table className="w-full table-fixed text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Mã NCC</th>
                                    <th className="w-[22%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tên nhà cung cấp</th>
                                    <th className="w-[20%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Liên hệ</th>
                                    <th className="w-[22%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Địa chỉ</th>
                                    <th className="w-[12%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                                    <th className="w-[14%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.map((supplier) => (
                                    <tr key={supplier.supplierId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium">{supplier.supplierId}</td>
                                        <td className="px-4 py-3 text-sm font-medium">{supplier.supplierName}</td>
                                        <td className="px-4 py-3 text-sm">{supplier.contactInfo}</td>
                                        <td className="px-4 py-3 text-sm">{supplier.address}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${supplier.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {supplier.isActive ? 'Hoạt động' : 'Ngừng'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-normal">
                                            <button
                                                className="h-8 px-3 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
                                                onClick={() => openEditModal(supplier)}
                                            >
                                                Sửa
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : null}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold">
                                {modalMode === 'create' ? 'Thêm nhà cung cấp mới' : 'Chỉnh sửa nhà cung cấp'}
                            </h3>
                            <button
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={closeModal}
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block sm:col-span-2">
                                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Tên nhà cung cấp <span className="text-red-500">*</span>
                                    </span>
                                    <input
                                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        value={form.supplierName}
                                        onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                                        placeholder="Ví dụ: Công ty Thực phẩm An Tâm"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Thông tin liên hệ</span>
                                    <input
                                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        value={form.contactInfo}
                                        onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
                                        placeholder="SĐT, email hoặc người phụ trách"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Địa chỉ</span>
                                    <input
                                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        placeholder="Ví dụ: 123 Nguyễn Trãi, Hà Nội"
                                    />
                                </label>

                                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 sm:col-span-2">
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300"
                                    />
                                    Kích hoạt nhà cung cấp
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
                            <button
                                className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                onClick={closeModal}
                            >
                                Hủy
                            </button>
                            <button
                                className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
                                disabled={loading}
                                onClick={modalMode === 'create' ? createSupplier : updateSupplier}
                            >
                                {loading ? 'Đang xử lý...' : modalMode === 'create' ? 'Thêm mới' : 'Cập nhật'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {notice.open && (
                <div className="fixed top-4 right-4 z-[60] pointer-events-none">
                    <div className="pointer-events-auto w-[min(92vw,24rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        <div className="px-4 py-3 flex items-start gap-3">
                            <span className={`material-symbols-outlined mt-0.5 ${notice.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {notice.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">
                                    {notice.type === 'success' ? 'Thao tác thành công' : 'Có lỗi xảy ra'}
                                </p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 break-words">{notice.message}</p>
                            </div>
                            <button
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={closeNotice}
                                aria-label="Đóng thông báo"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        <div className={`h-1 rounded-b-xl ${notice.type === 'success' ? 'bg-emerald-500/80' : 'bg-red-500/80'}`} />
                    </div>
                </div>
            )}
        </div>
    )
}
