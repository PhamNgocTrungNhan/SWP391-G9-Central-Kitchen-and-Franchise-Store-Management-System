import { useEffect, useMemo, useState } from 'react'
import { getApiBaseUrl } from '../utils/apiConfig'

const statusStyle = {
    active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    inactive: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
}

function toStoreItem(item) {
    const id = Number(item?.storeId ?? item?.id)
    if (!id) return null
    const users = Array.isArray(item?.users) ? item.users : []
    const manager = users[0]
    const active = Boolean(item?.isActive)
    return {
        id,
        code: `ST-${String(id).padStart(3, '0')}`,
        name: item?.storeName || 'Chưa có tên',
        address: item?.address || 'Chưa có địa chỉ',
        phone: item?.phone || 'Chưa có số điện thoại',
        status: active ? 'active' : 'inactive',
        manager: manager?.fullName || manager?.username || 'Chưa gán',
        managerLogin: manager?.username || 'N/A',
    }
}

export default function FranchiseNetworkPage() {
    const apiBase = getApiBaseUrl()
    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')

    const [showCreate, setShowCreate] = useState(false)
    const [showEdit, setShowEdit] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [editingStore, setEditingStore] = useState(null)
    const [deletingStore, setDeletingStore] = useState(null)
    const [formName, setFormName] = useState('')
    const [formAddress, setFormAddress] = useState('')
    const [formPhone, setFormPhone] = useState('')
    const [formIsActive, setFormIsActive] = useState(true)

    const [notice, setNotice] = useState({ open: false, type: 'success', message: '' })

    const token = () => localStorage.getItem('auth_token') || localStorage.getItem('token') || ''

    const openNotice = (type, message) => setNotice({ open: true, type, message })
    const closeNotice = () => setNotice((prev) => ({ ...prev, open: false }))

    const resetForm = () => {
        setFormName('')
        setFormAddress('')
        setFormPhone('')
        setFormIsActive(true)
    }

    const parseStoreArray = (data) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
        return list.map(toStoreItem).filter(Boolean)
    }

    const fetchStores = async () => {
        const tk = token()
        if (!tk) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return []
        }

        setLoading(true)
        try {
            const res = await fetch(`${apiBase}/Organization/stores`, {
                method: 'GET',
                headers: { accept: '*/*', Authorization: `Bearer ${tk}` },
            })
            const data = await res.json().catch(() => [])
            if (!res.ok) throw new Error(data?.message || data?.title || 'Không tải được danh sách cửa hàng.')
            const parsed = parseStoreArray(data)
            setStores(parsed)
            return parsed
        } catch (err) {
            setStores([])
            openNotice('error', err.message || 'Tải danh sách thất bại.')
            return []
        } finally {
            setLoading(false)
        }
    }

    const buildPayload = (storeId) => {
        const payload = {
            storeName: formName.trim(),
            address: formAddress.trim(),
            phone: formPhone.trim(),
            isActive: formIsActive,
        }
        if (Number(storeId) > 0) {
            payload.storeId = Number(storeId)
        }
        return payload
    }

    const sendStoreWrite = async (method, url, payload) => {
        const tk = token()
        if (!tk) throw new Error('Thiếu token đăng nhập.')
        // Backend now accepts flat JSON body for PUT/POST.
        let res = await fetch(url, {
            method,
            headers: {
                accept: '*/*',
                Authorization: `Bearer ${tk}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        // Fallback for older binder that expects { store: {...} }.
        if (!res.ok && (res.status === 400 || res.status === 415)) {
            const wrapped = { store: payload }
            res = await fetch(url, {
                method,
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(wrapped),
            })
        }

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            throw new Error(data?.message || data?.title || data?.errors?.store?.[0] || 'Yêu cầu thất bại.')
        }
    }

    const verifyUpdatedStore = (list, id, expected) => {
        const row = list.find((s) => s.id === id)
        if (!row) return false
        return (
            row.name === expected.storeName
            && row.address === expected.address
            && row.phone === expected.phone
            && (row.status === 'active') === expected.isActive
        )
    }

    const handleCreate = async () => {
        const payload = buildPayload(0)
        if (!payload.storeName || !payload.address || !payload.phone) {
            openNotice('error', 'Vui lòng nhập đầy đủ tên, địa chỉ và số điện thoại.')
            return
        }

        setSubmitting(true)
        try {
            await sendStoreWrite('POST', `${apiBase}/Organization/stores`, payload)
            setShowCreate(false)
            resetForm()
            await fetchStores()
            openNotice('success', 'Tạo cửa hàng thành công.')
        } catch (err) {
            openNotice('error', err.message || 'Tạo cửa hàng thất bại.')
        } finally {
            setSubmitting(false)
        }
    }

    const startEdit = (store) => {
        setEditingStore(store)
        setFormName(store.name)
        setFormAddress(store.address === 'Chưa có địa chỉ' ? '' : store.address)
        setFormPhone(store.phone === 'Chưa có số điện thoại' ? '' : store.phone)
        setFormIsActive(store.status === 'active')
        setShowEdit(true)
    }

    const handleUpdate = async () => {
        const id = Number(editingStore?.id)
        const payload = buildPayload(id)
        if (!id || !payload.storeName || !payload.address || !payload.phone) {
            openNotice('error', 'Thông tin cập nhật chưa hợp lệ.')
            return
        }

        setSubmitting(true)
        try {
            await sendStoreWrite('PUT', `${apiBase}/Organization/stores/${id}`, payload)
            const newList = await fetchStores()
            setShowEdit(false)
            setEditingStore(null)

            if (!verifyUpdatedStore(newList, id, payload)) {
                openNotice('error', 'API báo cập nhật thành công nhưng dữ liệu trả về không đúng. Khả năng cao lỗi nằm ở backend/database mapping.')
                return
            }

            openNotice('success', 'Cập nhật cửa hàng thành công.')
        } catch (err) {
            openNotice('error', err.message || 'Cập nhật cửa hàng thất bại.')
        } finally {
            setSubmitting(false)
        }
    }

    const startDelete = (store) => {
        setDeletingStore(store)
        setShowDelete(true)
    }

    const handleDelete = async () => {
        const id = Number(deletingStore?.id)
        if (!id) return

        const tk = token()
        if (!tk) {
            openNotice('error', 'Thiếu token đăng nhập.')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch(`${apiBase}/Organization/stores/${id}`, {
                method: 'DELETE',
                headers: { accept: '*/*', Authorization: `Bearer ${tk}` },
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.message || data?.title || 'Xóa cửa hàng thất bại.')

            const newList = await fetchStores()
            setShowDelete(false)
            setDeletingStore(null)

            const deletedRow = newList.find((s) => s.id === id)
            if (deletedRow && deletedRow.status !== 'inactive') {
                openNotice('error', 'API báo đã xóa nhưng trạng thái chưa đổi. Vui lòng kiểm tra backend/database.')
                return
            }

            openNotice('success', data?.message || 'Đã vô hiệu hóa cửa hàng thành công.')
        } catch (err) {
            openNotice('error', err.message || 'Không thể xóa cửa hàng.')
        } finally {
            setSubmitting(false)
        }
    }

    useEffect(() => {
        fetchStores()
    }, [])

    const filteredStores = useMemo(() => {
        const kw = keyword.trim().toLowerCase()
        if (!kw) return stores
        return stores.filter((s) => (
            s.code.toLowerCase().includes(kw)
            || s.name.toLowerCase().includes(kw)
            || s.address.toLowerCase().includes(kw)
            || s.phone.toLowerCase().includes(kw)
            || s.manager.toLowerCase().includes(kw)
        ))
    }, [keyword, stores])

    const activeCount = stores.filter((s) => s.status === 'active').length
    const inactiveCount = stores.length - activeCount

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-background-dark sticky top-0 z-10">
                <h2 className="text-lg font-bold">Quản lý cửa hàng</h2>
                <div className="flex items-center gap-2">
                    <button className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm" onClick={fetchStores}>Tải lại</button>
                    <button className="h-10 px-4 rounded-lg bg-primary text-white text-sm" onClick={() => { resetForm(); setShowCreate(true) }}>Thêm cửa hàng</button>
                </div>
            </header>

            <main className="p-6 lg:p-8 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">Tổng cửa hàng</p>
                        <p className="text-2xl font-bold">{stores.length}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">Đang hoạt động</p>
                        <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">Ngừng hoạt động</p>
                        <p className="text-2xl font-bold text-amber-600">{inactiveCount}</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="font-semibold text-lg">Danh sách cửa hàng</h3>
                        <input
                            className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm w-full sm:w-72"
                            placeholder="Tìm cửa hàng..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                    {['Thông tin', 'Quản lý', 'Địa chỉ', 'Trạng thái', 'Thao tác'].map((h) => (
                                        <th key={h} className={`px-5 py-4 text-xs font-semibold uppercase tracking-wider ${h === 'Thao tác' ? 'text-right' : ''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? <tr><td colSpan={5} className="px-5 py-8 text-center text-sm">Đang tải dữ liệu...</td></tr> : null}
                                {!loading && filteredStores.length === 0 ? <tr><td colSpan={5} className="px-5 py-8 text-center text-sm">Không có dữ liệu.</td></tr> : null}
                                {!loading && filteredStores.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-5 py-4">
                                            <p className="font-medium text-sm">{s.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Mã: {s.code} - SĐT: {s.phone}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-medium">{s.manager}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">User: {s.managerLogin}</p>
                                        </td>
                                        <td className="px-5 py-4 text-sm">{s.address}</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[s.status]}`}>
                                                {s.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button className="text-slate-400 hover:text-primary p-1" onClick={() => startEdit(s)}>
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                            <button className="text-slate-400 hover:text-red-500 p-1 ml-1" onClick={() => startDelete(s)}>
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {(showCreate || showEdit) ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                            <h3 className="text-lg font-semibold">{showCreate ? 'Thêm cửa hàng' : 'Cập nhật cửa hàng'}</h3>
                            <button className="text-slate-500" onClick={() => { setShowCreate(false); setShowEdit(false); }} disabled={submitting}><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 px-6 py-5">
                            <label className="flex flex-col gap-1">
                                <span className="text-sm">Tên cửa hàng</span>
                                <input type="text" className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 text-sm" value={formName} onChange={(e) => setFormName(e.target.value)} />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-sm">Địa chỉ</span>
                                <input type="text" className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 text-sm" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-sm">Số điện thoại</span>
                                <input type="text" className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 text-sm" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                            </label>
                            <label className="flex items-center gap-2 pt-1">
                                <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
                                <span className="text-sm">Đang hoạt động</span>
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
                            <button className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 px-4 text-sm" onClick={() => { setShowCreate(false); setShowEdit(false); }} disabled={submitting}>Hủy</button>
                            <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60" onClick={showCreate ? handleCreate : handleUpdate} disabled={submitting}>
                                {submitting ? 'Đang xử lý...' : showCreate ? 'Tạo cửa hàng' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {showDelete ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Xác nhận xóa</h3>
                        </div>
                        <div className="px-6 py-5 text-sm">Bạn có chắc muốn vô hiệu hóa cửa hàng {deletingStore?.name}?</div>
                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
                            <button className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 px-4 text-sm" onClick={() => setShowDelete(false)} disabled={submitting}>Hủy</button>
                            <button className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-60" onClick={handleDelete} disabled={submitting}>{submitting ? 'Đang xóa...' : 'Xóa cửa hàng'}</button>
                        </div>
                    </div>
                </div>
            ) : null}

            {notice.open ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                            <span className={`material-symbols-outlined ${notice.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{notice.type === 'success' ? 'check_circle' : 'error'}</span>
                            <h4 className="font-semibold text-sm">{notice.type === 'success' ? 'Thông báo thành công' : 'Thông báo lỗi'}</h4>
                        </div>
                        <div className="px-5 py-4 text-sm">{notice.message}</div>
                        <div className="px-5 pb-5 flex justify-end">
                            <button className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white" onClick={closeNotice}>Đóng</button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
