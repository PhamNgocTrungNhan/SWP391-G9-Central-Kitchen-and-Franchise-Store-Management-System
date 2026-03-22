import { useEffect, useState } from 'react'

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
        supplierName: item?.supplierName || item?.name || `Nhà cung cấp #${supplierId}`,
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
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingSupplierId, setEditingSupplierId] = useState(null)
  const [form, setForm] = useState({
    supplierName: '',
    contactInfo: '',
    address: '',
    isActive: true,
  })
  const [editForm, setEditForm] = useState({
    supplierName: '',
    contactInfo: '',
    address: '',
    isActive: true,
  })

  const fetchSuppliers = async () => {
    setError('')

    const token = getToken()
    if (!token) {
      setSuppliers([])
      setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
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
      setError(requestError.message || 'Tải dữ liệu nhà cung cấp thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateEditForm = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }))
  }

  const startEdit = (supplier) => {
    setUpdateError('')
    setUpdateSuccess('')
    setEditingSupplierId(supplier.supplierId)
    setEditForm({
      supplierName: supplier.supplierName,
      contactInfo: supplier.contactInfo === 'Chưa có thông tin liên hệ' ? '' : supplier.contactInfo,
      address: supplier.address === 'Chưa có địa chỉ' ? '' : supplier.address,
      isActive: Boolean(supplier.isActive),
    })
  }

  const cancelEdit = () => {
    setEditingSupplierId(null)
    setUpdateError('')
    setEditForm({
      supplierName: '',
      contactInfo: '',
      address: '',
      isActive: true,
    })
  }

  const createSupplier = async (event) => {
    event.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    const token = getToken()
    if (!token) {
      setCreateError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    const supplierName = String(form.supplierName || '').trim()
    if (!supplierName) {
      setCreateError('Vui lòng nhập tên nhà cung cấp.')
      return
    }

    setCreating(true)
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

      setCreateSuccess(data?.message || 'Thêm nhà cung cấp thành công.')
      setForm({
        supplierName: '',
        contactInfo: '',
        address: '',
        isActive: true,
      })
      setIsCreateModalOpen(false)
      await fetchSuppliers()
    } catch (requestError) {
      setCreateError(requestError.message || 'Thêm nhà cung cấp thất bại.')
    } finally {
      setCreating(false)
    }
  }

  const openCreateModal = () => {
    setCreateError('')
    setIsCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    if (creating) return
    setCreateError('')
    setIsCreateModalOpen(false)
  }

  const updateSupplier = async (event) => {
    event.preventDefault()
    setUpdateError('')
    setUpdateSuccess('')

    if (!editingSupplierId) {
      setUpdateError('Không tìm thấy nhà cung cấp cần cập nhật.')
      return
    }

    const token = getToken()
    if (!token) {
      setUpdateError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    const supplierName = String(editForm.supplierName || '').trim()
    if (!supplierName) {
      setUpdateError('Vui lòng nhập tên nhà cung cấp.')
      return
    }

    setUpdating(true)
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
          contactInfo: String(editForm.contactInfo || '').trim(),
          address: String(editForm.address || '').trim(),
          isActive: Boolean(editForm.isActive),
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.message || data?.title || 'Không thể cập nhật nhà cung cấp.')
      }

      setUpdateSuccess(data?.message || 'Cập nhật nhà cung cấp thành công.')
      await fetchSuppliers()
    } catch (requestError) {
      setUpdateError(requestError.message || 'Cập nhật nhà cung cấp thất bại.')
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#243428]">Danh sách nhà cung cấp</h1>
          <p className="mt-1 text-sm text-slate-600">Đồng bộ trực tiếp từ API /Suppliers.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#4e5d43] px-4 text-sm font-semibold text-white transition hover:bg-[#415238]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tạo nhà cung cấp
          </button>
          <button
            type="button"
            onClick={fetchSuppliers}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d9c9b4] bg-white px-4 text-sm font-semibold text-[#4e5d43] transition hover:bg-[#fff5e7]"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Tải lại
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {createSuccess ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{createSuccess}</div>
      ) : null}

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4" onClick={closeCreateModal}>
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-800">Thêm nhà cung cấp mới</h2>
              <button
                type="button"
                onClick={closeCreateModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <form onSubmit={createSupplier} className="mt-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Tên nhà cung cấp
                  <input
                    type="text"
                    value={form.supplierName}
                    onChange={(event) => updateForm('supplierName', event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#4e5d43]"
                    placeholder="Ví dụ: Công ty Thực phẩm An Tâm"
                    required
                  />
                </label>

                <label className="text-sm text-slate-700">
                  Thông tin liên hệ
                  <input
                    type="text"
                    value={form.contactInfo}
                    onChange={(event) => updateForm('contactInfo', event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#4e5d43]"
                    placeholder="SĐT, email hoặc người phụ trách"
                  />
                </label>

                <label className="text-sm text-slate-700 md:col-span-2">
                  Địa chỉ
                  <input
                    type="text"
                    value={form.address}
                    onChange={(event) => updateForm('address', event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#4e5d43]"
                    placeholder="Ví dụ: 123 Nguyễn Trãi, Hà Nội"
                  />
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => updateForm('isActive', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Kích hoạt nhà cung cấp
                </label>
              </div>

              {createError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</div>
              ) : null}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex h-10 items-center rounded-xl bg-[#4e5d43] px-4 text-sm font-semibold text-white transition hover:bg-[#415238] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? 'Đang lưu...' : 'Thêm nhà cung cấp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingSupplierId ? (
        <form onSubmit={updateSupplier} className="rounded-2xl border border-[#d9c9b4] bg-[#fffdf7] p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800">Cập nhật nhà cung cấp #{editingSupplierId}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Tên nhà cung cấp
              <input
                type="text"
                value={editForm.supplierName}
                onChange={(event) => updateEditForm('supplierName', event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#4e5d43]"
                required
              />
            </label>

            <label className="text-sm text-slate-700">
              Thông tin liên hệ
              <input
                type="text"
                value={editForm.contactInfo}
                onChange={(event) => updateEditForm('contactInfo', event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#4e5d43]"
              />
            </label>

            <label className="text-sm text-slate-700 md:col-span-2">
              Địa chỉ
              <input
                type="text"
                value={editForm.address}
                onChange={(event) => updateEditForm('address', event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#4e5d43]"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(event) => updateEditForm('isActive', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Kích hoạt nhà cung cấp
            </label>
          </div>

          {updateError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{updateError}</div>
          ) : null}

          {updateSuccess ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{updateSuccess}</div>
          ) : null}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={updating}
              className="inline-flex h-10 items-center rounded-xl bg-[#4e5d43] px-4 text-sm font-semibold text-white transition hover:bg-[#415238] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updating ? 'Đang cập nhật...' : 'Lưu cập nhật'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              {['Mã NCC', 'Tên nhà cung cấp', 'Thông tin liên hệ', 'Địa chỉ', 'Trạng thái', 'Thao tác'].map((heading) => (
                <th key={heading} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">Đang tải dữ liệu nhà cung cấp...</td>
              </tr>
            ) : null}

            {!loading && suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">Chưa có dữ liệu nhà cung cấp.</td>
              </tr>
            ) : null}

            {!loading && suppliers.map((supplier) => (
              <tr key={supplier.supplierId} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 text-sm font-semibold">#{supplier.supplierId}</td>
                <td className="px-4 py-3 text-sm">{supplier.supplierName}</td>
                <td className="px-4 py-3 text-sm">{supplier.contactInfo}</td>
                <td className="px-4 py-3 text-sm">{supplier.address}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${supplier.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {supplier.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    type="button"
                    onClick={() => startEdit(supplier)}
                    className="inline-flex h-8 items-center rounded-lg border border-[#d9c9b4] bg-white px-3 text-xs font-semibold text-[#4e5d43] transition hover:bg-[#fff5e7]"
                  >
                    Sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
