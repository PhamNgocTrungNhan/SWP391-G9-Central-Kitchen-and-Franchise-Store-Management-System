import { useEffect, useState, useMemo } from 'react'
import { MetricsStrip } from '../components/ui'
import { getCurrentUserRole } from '../utils/auth'

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

export default function StoresPage() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    const currentRole = getCurrentUserRole()
    const isAdmin = currentRole === 'ADMIN'

    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [stores, setStores] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('create')
    const [editingStoreId, setEditingStoreId] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [notice, setNotice] = useState({ open: false, type: 'success', message: '' })
    const [form, setForm] = useState({
        storeName: '',
        address: '',
        phone: '',
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

    const fetchStores = async () => {
        const token = getToken()
        if (!token) {
            setStores([])
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`${apiBase}/Organization/stores`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => [])
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể tải danh sách cửa hàng.')
            }

            let storesArray = parseArrayData(data)

            // Nếu là STORE_STAFF, chỉ hiển thị cửa hàng của mình
            if (currentRole === 'STORE_STAFF') {
                const userStoreId = localStorage.getItem('storeId') || localStorage.getItem('store_id')
                if (userStoreId) {
                    storesArray = storesArray.filter(s => Number(s.storeId) === Number(userStoreId))
                }
            }

            setStores(storesArray)
        } catch (requestError) {
            setStores([])
            openNotice('error', requestError.message || 'Tải dữ liệu cửa hàng thất bại.')
        } finally {
            setLoading(false)
        }
    }

    const openCreateModal = () => {
        setModalMode('create')
        setForm({
            storeName: '',
            address: '',
            phone: '',
            isActive: true,
        })
        setShowModal(true)
    }

    const openEditModal = (store) => {
        setModalMode('edit')
        setEditingStoreId(store.storeId)
        setForm({
            storeName: store.storeName || '',
            address: store.address || '',
            phone: store.phone || '',
            isActive: store.isActive !== false,
        })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingStoreId(null)
    }

    const validateForm = () => {
        if (!form.storeName || form.storeName.trim().length < 3) {
            openNotice('error', 'Tên cửa hàng phải có ít nhất 3 ký tự.')
            return false
        }
        if (!form.address || form.address.trim().length < 10) {
            openNotice('error', 'Địa chỉ phải có ít nhất 10 ký tự.')
            return false
        }
        if (!form.phone || !/^\d{10}$/.test(form.phone.trim())) {
            openNotice('error', 'Số điện thoại phải có đúng 10 chữ số.')
            return false
        }
        return true
    }

    const createStore = async () => {
        if (!validateForm()) return

        const token = getToken()
        if (!token) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`${apiBase}/Organization/stores`, {
                method: 'POST',
                headers: {
                    accept: '*/*',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    storeName: form.storeName.trim(),
                    address: form.address.trim(),
                    phone: form.phone.trim(),
                    isActive: Boolean(form.isActive),
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể thêm cửa hàng.')
            }

            openNotice('success', data?.message || 'Thêm cửa hàng thành công.')
            closeModal()
            await fetchStores()
        } catch (requestError) {
            openNotice('error', requestError.message || 'Thêm cửa hàng thất bại.')
        } finally {
            setSubmitting(false)
        }
    }

    const updateStore = async () => {
        if (!validateForm()) return
        if (!editingStoreId) {
            openNotice('error', 'Không tìm thấy cửa hàng cần cập nhật.')
            return
        }

        const token = getToken()
        if (!token) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`${apiBase}/Organization/stores/${editingStoreId}`, {
                method: 'PUT',
                headers: {
                    accept: '*/*',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    storeName: form.storeName.trim(),
                    address: form.address.trim(),
                    phone: form.phone.trim(),
                    isActive: Boolean(form.isActive),
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể cập nhật cửa hàng.')
            }

            openNotice('success', data?.message || 'Cập nhật cửa hàng thành công.')
            closeModal()
            await fetchStores()
        } catch (requestError) {
            openNotice('error', requestError.message || 'Cập nhật cửa hàng thất bại.')
        } finally {
            setSubmitting(false)
        }
    }

    const deleteStore = async (storeId, storeName) => {
        if (!window.confirm(`Bạn có chắc muốn vô hiệu hóa cửa hàng "${storeName}"?\n\nCảnh báo: thao tác này sẽ chuyển trạng thái cửa hàng sang ngừng hoạt động.`)) {
            return
        }

        const token = getToken()
        if (!token) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`${apiBase}/Organization/stores/${storeId}`, {
                method: 'DELETE',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.message || data?.title || 'Không thể xóa cửa hàng.')
            }

            openNotice('success', data?.message || 'Đã vô hiệu hóa cửa hàng thành công.')
            await fetchStores()
        } catch (requestError) {
            openNotice('error', requestError.message || 'Xóa cửa hàng thất bại.')
        } finally {
            setSubmitting(false)
        }
    }

    const stats = useMemo(() => ({
        total: stores.length,
        active: stores.filter((s) => s.isActive).length,
        inactive: stores.filter((s) => !s.isActive).length,
    }), [stores])

    const statsItems = [
        {
            key: 'store-total',
            label: 'Tổng cửa hàng',
            value: Number(stats.total || 0).toLocaleString('vi-VN'),
            icon: 'store',
            tone: 'blue',
        },
        {
            key: 'store-active',
            label: 'Đang hoạt động',
            value: Number(stats.active || 0).toLocaleString('vi-VN'),
            icon: 'check_circle',
            tone: 'emerald',
        },
        {
            key: 'store-inactive',
            label: 'Ngừng hoạt động',
            value: Number(stats.inactive || 0).toLocaleString('vi-VN'),
            icon: 'cancel',
            tone: 'red',
        },
    ]

    const filtered = useMemo(() => {
        let result = stores

        if (statusFilter === 'Active') {
            result = result.filter((s) => s.isActive)
        } else if (statusFilter === 'Inactive') {
            result = result.filter((s) => !s.isActive)
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase()
            result = result.filter((s) =>
                s.storeName?.toLowerCase().includes(term) ||
                s.address?.toLowerCase().includes(term) ||
                s.phone?.toLowerCase().includes(term)
            )
        }

        return result
    }, [stores, statusFilter, searchTerm])

    useEffect(() => {
        fetchStores()
    }, [])

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">store</span>
                    <h2 className="text-lg font-bold leading-tight">Quản lý cửa hàng</h2>
                </div>
                {isAdmin && (
                    <button
                        className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                        onClick={openCreateModal}
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>Thêm cửa hàng
                    </button>
                )}
            </header>

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold">
                        {currentRole === 'STORE_STAFF' ? 'Thông tin cửa hàng của tôi' : 'Danh sách cửa hàng'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {currentRole === 'STORE_STAFF'
                            ? 'Xem thông tin chi tiết cửa hàng bạn đang quản lý.'
                            : 'Quản lý thông tin các chi nhánh cửa hàng trong hệ thống.'}
                    </p>
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
                                placeholder="Tìm theo tên, địa chỉ hoặc số điện thoại..."
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
                    {!loading && filtered.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">Không có cửa hàng phù hợp.</div> : null}

                    {!loading && filtered.length > 0 && currentRole === 'STORE_STAFF' && filtered.length === 1 ? (
                        // Card view cho STORE_STAFF (chỉ 1 cửa hàng)
                        <div className="p-6">
                            {filtered.map((store) => (
                                <div key={store.storeId} className="space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{store.storeName}</h2>
                                            <p className="mt-1 text-sm text-slate-500">ID: {store.storeId}</p>
                                        </div>
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${store.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {store.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                                        </span>
                                    </div>

                                    <div className="grid gap-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                <span className="material-symbols-outlined text-[20px]">location_on</span>
                                                <span className="text-sm font-medium">Địa chỉ</span>
                                            </div>
                                            <p className="text-slate-900 dark:text-slate-100 pl-7">{store.address}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                <span className="material-symbols-outlined text-[20px]">phone</span>
                                                <span className="text-sm font-medium">Số điện thoại</span>
                                            </div>
                                            <p className="text-slate-900 dark:text-slate-100 pl-7">{store.phone}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Đây là thông tin cửa hàng bạn đang quản lý. Nếu có thay đổi, vui lòng liên hệ quản trị viên.
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !loading && filtered.length > 0 ? (
                        // Table view cho ADMIN/MANAGER
                        <table className="w-full table-fixed text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="w-[8%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                                    <th className="w-[24%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tên cửa hàng</th>
                                    <th className="w-[27%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Địa chỉ</th>
                                    <th className="w-[15%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Điện thoại</th>
                                    <th className="w-[12%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Trạng thái</th>
                                    {isAdmin && <th className="w-[14%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.map((store) => (
                                    <tr key={store.storeId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium">{store.storeId}</td>
                                        <td className="px-4 py-3 text-sm font-medium">{store.storeName}</td>
                                        <td className="px-4 py-3 text-sm">{store.address}</td>
                                        <td className="px-4 py-3 text-sm">{store.phone}</td>
                                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${store.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {store.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        className="h-8 px-3 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
                                                        onClick={() => openEditModal(store)}
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        className="h-8 px-3 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                                                        onClick={() => deleteStore(store.storeId, store.storeName)}
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : null}
                </div>
            </div>

            {showModal && isAdmin && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold">
                                {modalMode === 'create' ? 'Thêm cửa hàng mới' : 'Chỉnh sửa cửa hàng'}
                            </h3>
                            <button
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={closeModal}
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            <div className="grid gap-4">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Tên cửa hàng <span className="text-red-500">*</span>
                                    </span>
                                    <input
                                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        value={form.storeName}
                                        onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                                        placeholder="Ví dụ: Store A - Chi nhánh Quận 1"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Địa chỉ <span className="text-red-500">*</span>
                                    </span>
                                    <input
                                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        placeholder="Ví dụ: 123 Nguyễn Huệ, Quận 1, TP.HCM"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Số điện thoại <span className="text-red-500">*</span>
                                    </span>
                                    <input
                                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="Ví dụ: 0901234567"
                                        maxLength={10}
                                    />
                                </label>

                                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300"
                                    />
                                    Cửa hàng đang hoạt động
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
                                disabled={submitting}
                                onClick={modalMode === 'create' ? createStore : updateStore}
                            >
                                {submitting ? 'Đang xử lý...' : modalMode === 'create' ? 'Thêm mới' : 'Cập nhật'}
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
