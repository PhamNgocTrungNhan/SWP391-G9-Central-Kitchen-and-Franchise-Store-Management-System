import { useEffect, useMemo, useState } from 'react'
import { getApiBaseUrl } from '../utils/apiConfig'

function toKitchenItem(item) {
    const id = Number(item?.kitchenId ?? item?.id)
    if (!id) return null

    const users = Array.isArray(item?.users) ? item.users : []
    const manager = users.find((u) => (u?.roleId === 2 || String(u?.role?.roleName || '').toUpperCase().includes('MANAGER'))) || users[0]

    return {
        id,
        code: `KT-${String(id).padStart(3, '0')}`,
        name: item?.kitchenName || 'Chưa có tên bếp',
        address: item?.address || 'Chưa có địa chỉ',
        userCount: users.length,
        managerName: manager?.fullName || manager?.username || 'Chưa gán',
        managerUsername: manager?.username || 'N/A',
    }
}

export default function KitchenManagementPage() {
    const apiBase = getApiBaseUrl()
    const [kitchens, setKitchens] = useState([])
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [notice, setNotice] = useState({ open: false, type: 'error', message: '' })

    const [showEdit, setShowEdit] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [editingKitchen, setEditingKitchen] = useState(null)
    const [formKitchenName, setFormKitchenName] = useState('')
    const [formAddress, setFormAddress] = useState('')

    const openNotice = (type, message) => setNotice({ open: true, type, message })
    const closeNotice = () => setNotice((prev) => ({ ...prev, open: false }))
    const token = () => localStorage.getItem('auth_token') || localStorage.getItem('token') || ''

    const fetchKitchens = async () => {
        const tk = token()
        if (!tk) {
            openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
            return []
        }

        setLoading(true)
        try {
            const res = await fetch(`${apiBase}/Organization/kitchens`, {
                method: 'GET',
                headers: {
                    accept: '*/*',
                    Authorization: `Bearer ${tk}`,
                },
            })
            const data = await res.json().catch(() => [])
            if (!res.ok) {
                throw new Error(data?.message || data?.title || 'Không tải được danh sách bếp.')
            }

            const list = (Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [])
            const normalized = list.map(toKitchenItem).filter(Boolean)
            setKitchens(normalized)
            return normalized
        } catch (error) {
            setKitchens([])
            openNotice('error', error.message || 'Tải danh sách bếp thất bại.')
            return []
        } finally {
            setLoading(false)
        }
    }

    const buildKitchenPayload = (kitchenId) => ({
        kitchenId: Number(kitchenId),
        kitchenName: formKitchenName.trim(),
        address: formAddress.trim(),
    })

    const sendKitchenWrite = async (method, url, payload) => {
        const tk = token()
        if (!tk) throw new Error('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')

        let res = await fetch(url, {
            method,
            headers: {
                accept: '*/*',
                Authorization: `Bearer ${tk}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            throw new Error(
                data?.message
                || data?.title
                || data?.errors?.kitchenName?.[0]
                || data?.errors?.KitchenName?.[0]
                || data?.errors?.kitchen?.[0]
                || 'Yêu cầu thất bại.',
            )
        }

        return data
    }

    const verifyUpdatedKitchen = (list, id, expected) => {
        if (!Array.isArray(list)) return false
        const row = list.find((k) => k.id === id)
        if (!row) return false

        const normalize = (value) => String(value || '').trim().toLowerCase()
        return normalize(row.name) === normalize(expected.kitchenName)
            && normalize(row.address) === normalize(expected.address)
    }

    const startEditKitchen = (kitchen) => {
        setEditingKitchen(kitchen)
        setFormKitchenName(kitchen.name === 'Chưa có tên bếp' ? '' : kitchen.name)
        setFormAddress(kitchen.address === 'Chưa có địa chỉ' ? '' : kitchen.address)
        setShowEdit(true)
    }

    const handleUpdateKitchen = async () => {
        const id = Number(editingKitchen?.id)
        const payload = buildKitchenPayload(id)
        if (!id || !payload.kitchenName || !payload.address) {
            openNotice('error', 'Thông tin cập nhật chưa hợp lệ.')
            return
        }

        setSubmitting(true)
        try {
            const data = await sendKitchenWrite('PUT', `${apiBase}/Organization/kitchens/${id}`, payload)
            const refreshedList = await fetchKitchens()
            setShowEdit(false)
            setEditingKitchen(null)

            if (!verifyUpdatedKitchen(refreshedList, id, payload)) {
                openNotice('error', 'API báo cập nhật thành công nhưng dữ liệu chưa đổi đúng. Vui lòng kiểm tra backend.')
                return
            }

            openNotice('success', data?.message || 'Cập nhật bếp trung tâm thành công.')
        } catch (error) {
            openNotice('error', error.message || 'Cập nhật bếp trung tâm thất bại.')
        } finally {
            setSubmitting(false)
        }
    }

    useEffect(() => {
        fetchKitchens()
    }, [])

    const filteredKitchens = useMemo(() => {
        const kw = keyword.trim().toLowerCase()
        if (!kw) return kitchens

        return kitchens.filter((k) => (
            k.code.toLowerCase().includes(kw)
            || k.name.toLowerCase().includes(kw)
            || k.address.toLowerCase().includes(kw)
            || k.managerName.toLowerCase().includes(kw)
            || k.managerUsername.toLowerCase().includes(kw)
        ))
    }, [kitchens, keyword])

    const kitchensWithManager = kitchens.filter((k) => k.managerName !== 'Chưa gán').length

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-background-dark sticky top-0 z-10">
                <h2 className="text-lg font-bold">Quản lý bếp trung tâm</h2>
                <div className="flex items-center gap-2">
                    <button className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm" onClick={fetchKitchens}>Tải lại</button>
                </div>
            </header>

            <main className="p-6 lg:p-8 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">Tổng số bếp</p>
                        <p className="text-2xl font-bold">{kitchens.length}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">Bếp đã gán quản lý</p>
                        <p className="text-2xl font-bold text-emerald-600">{kitchensWithManager}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">Bếp chưa gán quản lý</p>
                        <p className="text-2xl font-bold text-amber-600">{kitchens.length - kitchensWithManager}</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="font-semibold text-lg">Danh sách bếp trung tâm</h3>
                        <input
                            className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm w-full sm:w-72"
                            placeholder="Tìm bếp..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                    {['Thông tin bếp', 'Quản lý', 'Địa chỉ', 'Số nhân sự', 'Thao tác'].map((h) => (
                                        <th key={h} className={`px-5 py-4 text-xs font-semibold uppercase tracking-wider ${h === 'Thao tác' ? 'text-right' : ''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? <tr><td colSpan={5} className="px-5 py-8 text-center text-sm">Đang tải dữ liệu...</td></tr> : null}
                                {!loading && filteredKitchens.length === 0 ? <tr><td colSpan={5} className="px-5 py-8 text-center text-sm">Không có dữ liệu.</td></tr> : null}
                                {!loading && filteredKitchens.map((k) => (
                                    <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-5 py-4">
                                            <p className="font-medium text-sm">{k.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Mã: {k.code}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-medium">{k.managerName}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">User: {k.managerUsername}</p>
                                        </td>
                                        <td className="px-5 py-4 text-sm">{k.address}</td>
                                        <td className="px-5 py-4 text-sm">{k.userCount}</td>
                                        <td className="px-5 py-4 text-right">
                                            <button className="text-slate-400 hover:text-primary p-1" onClick={() => startEditKitchen(k)}>
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {showEdit ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                            <h3 className="text-lg font-semibold">Cập nhật bếp trung tâm</h3>
                            <button className="text-slate-500" onClick={() => { setShowEdit(false); setEditingKitchen(null) }} disabled={submitting}><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 px-6 py-5">
                            <label className="flex flex-col gap-1">
                                <span className="text-sm">Tên bếp trung tâm</span>
                                <input
                                    type="text"
                                    className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 text-sm"
                                    value={formKitchenName}
                                    onChange={(e) => setFormKitchenName(e.target.value)}
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-sm">Địa chỉ</span>
                                <input
                                    type="text"
                                    className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 text-sm"
                                    value={formAddress}
                                    onChange={(e) => setFormAddress(e.target.value)}
                                />
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
                            <button className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 px-4 text-sm" onClick={() => { setShowEdit(false); setEditingKitchen(null) }} disabled={submitting}>Hủy</button>
                            <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60" onClick={handleUpdateKitchen} disabled={submitting}>
                                {submitting ? 'Đang xử lý...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {notice.open ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                            <span className={`material-symbols-outlined ${notice.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {notice.type === 'success' ? 'check_circle' : 'error'}
                            </span>
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
