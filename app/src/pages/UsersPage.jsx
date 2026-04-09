import { useState, useEffect, useMemo } from 'react'
import { MetricsStrip } from '../components/ui'

function parseArrayData(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

const ROLE = {
  ADMIN: 1,
  MANAGER: 2,
  SUPPLY_COORDINATOR: 3,
  KITCHEN_STAFF: 4,
  STORE_STAFF: 5,
}

function requiresStoreAssignment(roleId) {
  return Number(roleId) === ROLE.STORE_STAFF
}

function requiresKitchenAssignment(roleId) {
  return Number(roleId) === ROLE.KITCHEN_STAFF
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

export default function UsersPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const [users, setUsers] = useState([])
  const [stores, setStores] = useState([])
  const [kitchens, setKitchens] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState({
    userId: 0,
    username: '',
    passwordHash: '',
    fullName: '',
    roleId: null,
    storeId: null,
    kitchenId: null,
  })
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' or 'edit'
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [notice, setNotice] = useState({ open: false, type: 'success', message: '' })

  const openNotice = (type, message) => setNotice({ open: true, type, message })
  const closeNotice = () => setNotice((prev) => ({ ...prev, open: false }))

  useEffect(() => {
    if (!notice.open) return undefined

    const timer = window.setTimeout(() => {
      setNotice((prev) => ({ ...prev, open: false }))
    }, 2800)

    return () => window.clearTimeout(timer)
  }, [notice.open, notice.message])

  const fetchUsers = async () => {
    const tk = getToken()
    if (!tk) {
      openNotice('error', 'Bạn chưa đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/User`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (response.ok) {
        const data = await response.json()
        const usersArray = parseArrayData(data)
        setUsers(usersArray)
      } else {
        openNotice('error', 'Không thể tải danh sách người dùng.')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      openNotice('error', 'Có lỗi xảy ra khi tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }

  const fetchStores = async () => {
    const tk = getToken()
    if (!tk) return

    try {
      const response = await fetch(`${apiBase}/Organization/stores`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (response.ok) {
        const data = await response.json()
        const storesArray = parseArrayData(data)
        setStores(storesArray)
      } else {
        console.error('Failed to fetch stores:', response.status)
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
    }
  }

  const fetchKitchens = async () => {
    const tk = getToken()
    if (!tk) return

    try {
      const response = await fetch(`${apiBase}/Organization/kitchens`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (response.ok) {
        const data = await response.json()
        const kitchensArray = parseArrayData(data)
        setKitchens(kitchensArray)
      } else {
        console.error('Failed to fetch kitchens:', response.status)
      }
    } catch (error) {
      console.error('Error fetching kitchens:', error)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchStores()
    fetchKitchens()
  }, [])

  function openCreateModal() {
    setModalMode('create')
    setForm({
      userId: 0,
      username: '',
      passwordHash: '',
      fullName: '',
      roleId: null,
      storeId: null,
      kitchenId: null,
    })
    setShowModal(true)
  }

  function openEditModal(user) {
    setModalMode('edit')
    setSelectedId(user.userId)
    setForm({
      userId: user.userId,
      username: user.username,
      passwordHash: '', // Don't show password
      fullName: user.fullName,
      roleId: user.roleId,
      storeId: user.storeId,
      kitchenId: user.kitchenId,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setSelectedId(null)
  }

  function updateField(key, value) {
    setForm({ ...form, [key]: value })
  }

  function handleRoleChange(nextRoleIdText) {
    const nextRoleId = nextRoleIdText ? Number(nextRoleIdText) : null
    setForm((prev) => ({
      ...prev,
      roleId: nextRoleId,
      storeId: requiresStoreAssignment(nextRoleId) ? prev.storeId : null,
      kitchenId: requiresKitchenAssignment(nextRoleId) ? prev.kitchenId : null,
    }))
  }

  function validateUserForm(mode) {
    const username = String(form.username || '').trim()
    const passwordHash = String(form.passwordHash || '').trim()
    const roleId = Number(form.roleId)
    const storeId = form.storeId ? Number(form.storeId) : null
    const kitchenId = form.kitchenId ? Number(form.kitchenId) : null

    if (!username || !roleId) {
      openNotice('error', 'Vui lòng điền đầy đủ: Tên đăng nhập, Vai trò')
      return false
    }

    if (mode === 'create' && !passwordHash) {
      openNotice('error', 'Vui lòng nhập mật khẩu khi tạo user mới.')
      return false
    }

    if (requiresStoreAssignment(roleId) && !storeId) {
      openNotice('error', 'Vai trò STORE_STAFF bắt buộc chọn cửa hàng.')
      return false
    }

    if (requiresKitchenAssignment(roleId) && !kitchenId) {
      openNotice('error', 'Vai trò KITCHEN_STAFF bắt buộc chọn bếp.')
      return false
    }

    return true
  }

  function buildUserPayload() {
    const username = String(form.username || '').trim()
    const passwordHash = String(form.passwordHash || '').trim()
    const fullName = String(form.fullName || '').trim()
    const roleId = Number(form.roleId)

    const payload = {
      username,
      fullName: fullName || null,
      roleId,
      storeId: requiresStoreAssignment(roleId) ? Number(form.storeId) : null,
      kitchenId: requiresKitchenAssignment(roleId) ? Number(form.kitchenId) : null,
    }

    if (passwordHash) {
      payload.passwordHash = passwordHash
    }

    return payload
  }

  const createUser = async () => {
    if (!validateUserForm('create')) {
      return
    }

    const tk = getToken()
    if (!tk) {
      openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${apiBase}/User`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildUserPayload()),
      })

      if (response.ok) {
        await fetchUsers()
        openNotice('success', 'Tạo người dùng thành công!')
        closeModal()
      } else {
        const error = await response.json()
        openNotice('error', error.message || 'Tạo người dùng thất bại!')
      }
    } catch (err) {
      console.error(err)
      openNotice('error', 'Có lỗi xảy ra!')
    } finally {
      setSubmitting(false)
    }
  }

  const updateUser = async () => {
    if (!selectedId) return
    if (!validateUserForm('edit')) {
      return
    }

    const tk = getToken()
    if (!tk) {
      openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${apiBase}/User/${selectedId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildUserPayload()),
      })

      if (response.ok) {
        await fetchUsers()
        openNotice('success', 'Cập nhật người dùng thành công!')
        closeModal()
      } else {
        const error = await response.json()
        openNotice('error', error.message || 'Cập nhật thất bại!')
      }
    } catch (err) {
      console.error(err)
      openNotice('error', 'Có lỗi xảy ra!')
    } finally {
      setSubmitting(false)
    }
  }

  const handleModalSubmit = (event) => {
    event.preventDefault()
    if (modalMode === 'create') {
      createUser()
      return
    }
    updateUser()
  }

  const deleteUser = async (userId, username) => {
    if (!window.confirm(`Bạn có chắc muốn xóa user "${username}"?\n\nCảnh báo: Thao tác này không thể hoàn tác!`)) {
      return
    }

    const tk = getToken()
    if (!tk) {
      openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${apiBase}/User/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (response.ok) {
        await fetchUsers()
        openNotice('success', 'Xóa người dùng thành công!')
      } else {
        const error = await response.json()
        openNotice('error', error.message || 'Xóa thất bại!')
      }
    } catch (err) {
      console.error(err)
      openNotice('error', 'Có lỗi xảy ra!')
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleName = (roleId) => {
    const roleMap = {
      1: 'ADMIN',
      2: 'MANAGER',
      3: 'SUPPLY_COORDINATOR',
      4: 'KITCHEN_STAFF',
      5: 'STORE_STAFF',
    }
    return roleMap[roleId] || `Role ${roleId}`
  }

  const getRoleBadgeColor = (roleId) => {
    const colorMap = {
      1: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      3: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      4: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      5: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    }
    return colorMap[roleId] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  }

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.roleId === 1).length,
    managers: users.filter((u) => u.roleId === 2).length,
    coordinators: users.filter((u) => u.roleId === 3).length,
    staff: users.filter((u) => u.roleId === 4 || u.roleId === 5).length,
  }), [users])

  const statsItems = useMemo(() => ([
    {
      key: 'users-total',
      label: 'Tổng người dùng',
      value: Number(stats.total || 0).toLocaleString('vi-VN'),
      note: 'Tài khoản trong hệ thống',
      icon: 'group',
      tone: 'blue',
    },
    {
      key: 'users-admin',
      label: 'Quản trị viên',
      value: Number(stats.admins || 0).toLocaleString('vi-VN'),
      note: 'Nhóm ADMIN',
      icon: 'admin_panel_settings',
      tone: 'red',
    },
    {
      key: 'users-manager',
      label: 'Quản lý',
      value: Number(stats.managers || 0).toLocaleString('vi-VN'),
      note: 'Nhóm MANAGER',
      icon: 'manage_accounts',
      tone: 'purple',
    },
    {
      key: 'users-staff',
      label: 'Nhân viên',
      value: Number(stats.staff || 0).toLocaleString('vi-VN'),
      note: 'Kitchen + Store staff',
      icon: 'badge',
      tone: 'green',
    },
  ]), [stats])

  const filtered = useMemo(() => {
    let result = users

    if (roleFilter !== 'All') {
      result = result.filter((u) => getRoleName(u.roleId) === roleFilter)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter((u) =>
        u.username?.toLowerCase().includes(term) ||
        u.fullName?.toLowerCase().includes(term)
      )
    }

    return result
  }, [users, roleFilter, searchTerm])

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[24px]">group</span>
          <h2 className="text-lg font-bold leading-tight">Quản lý người dùng</h2>
        </div>
        <button
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
          onClick={openCreateModal}
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>Thêm người dùng
        </button>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Danh sách người dùng</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quản lý tài khoản và phân quyền người dùng trong hệ thống.</p>
        </div>

        <MetricsStrip items={statsItems} columns="sm:grid-cols-2 xl:grid-cols-4" />

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Tìm kiếm</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên đăng nhập hoặc họ tên..."
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Lọc theo vai trò</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="All">Tất cả</option>
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="SUPPLY_COORDINATOR">SUPPLY_COORDINATOR</option>
                <option value="KITCHEN_STAFF">KITCHEN_STAFF</option>
                <option value="STORE_STAFF">STORE_STAFF</option>
              </select>
            </label>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {loading ? <div className="px-4 py-3 text-sm text-slate-500">Đang tải dữ liệu...</div> : null}
          {!loading && filtered.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">Không có người dùng phù hợp.</div> : null}

          {!loading && filtered.length > 0 ? (
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                  <th className="w-[18%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tên đăng nhập</th>
                  <th className="w-[20%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Họ tên</th>
                  <th className="w-[18%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Vai trò</th>
                  <th className="w-[18%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Phân công</th>
                  <th className="w-[16%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((user) => (
                  <tr key={user.userId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{user.userId}</td>
                    <td className="px-4 py-3 text-sm font-medium">{user.username}</td>
                    <td className="px-4 py-3 text-sm">{user.fullName || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(user.roleId)}`}>
                        {getRoleName(user.roleId)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.storeId && <span>Cửa hàng {user.storeId}</span>}
                      {user.storeId && user.kitchenId ? <span> | </span> : null}
                      {user.kitchenId && <span>Bếp {user.kitchenId}</span>}
                      {!user.storeId && !user.kitchenId && <span className="text-slate-400">Chưa phân công</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-normal">
                      <div className="flex gap-2">
                        <button
                          className="h-8 px-3 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
                          onClick={() => openEditModal(user)}
                        >
                          Sửa
                        </button>
                        <button
                          className="h-8 px-3 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                          onClick={() => deleteUser(user.userId, user.username)}
                        >
                          Xóa
                        </button>
                      </div>
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
                {modalMode === 'create' ? 'Thêm người dùng mới' : 'Chỉnh sửa người dùng'}
              </h3>
              <button
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={closeModal}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div className="px-6 py-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tên đăng nhập <span className="text-red-500">*</span>
                    </span>
                    <input
                      className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={form.username ?? ''}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      autoComplete="username"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Mật khẩu {modalMode === 'create' && <span className="text-red-500">*</span>}
                    </span>
                    <input
                      className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      type="password"
                      value={form.passwordHash ?? ''}
                      onChange={(e) => setForm({ ...form, passwordHash: e.target.value })}
                      placeholder={modalMode === 'edit' ? "Để trống nếu không đổi" : "Nhập mật khẩu"}
                      autoComplete={modalMode === 'create' ? 'new-password' : 'current-password'}
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Họ tên</span>
                    <input
                      className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={form.fullName ?? ''}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      autoComplete="name"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Vai trò <span className="text-red-500">*</span>
                    </span>
                    <select
                      className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={form.roleId ?? ''}
                      onChange={(e) => handleRoleChange(e.target.value)}
                    >
                      <option value="">-- Chọn vai trò --</option>
                      <option value="1">ADMIN</option>
                      <option value="2">MANAGER</option>
                      <option value="3">SUPPLY_COORDINATOR</option>
                      <option value="4">KITCHEN_STAFF</option>
                      <option value="5">STORE_STAFF</option>
                    </select>
                  </label>

                  {requiresStoreAssignment(form.roleId) && (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Cửa hàng <span className="text-red-500">*</span></span>
                      <select
                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        value={form.storeId ?? ''}
                        onChange={(e) => setForm({ ...form, storeId: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">-- Chọn cửa hàng --</option>
                        {stores.map((store) => (
                          <option key={store.storeId} value={store.storeId}>
                            {store.storeName}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {requiresKitchenAssignment(form.roleId) && (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Bếp <span className="text-red-500">*</span></span>
                      <select
                        className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        value={form.kitchenId ?? ''}
                        onChange={(e) => setForm({ ...form, kitchenId: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">-- Chọn bếp --</option>
                        {kitchens.map((kitchen) => (
                          <option key={kitchen.kitchenId} value={kitchen.kitchenId}>
                            {kitchen.kitchenName}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {!requiresStoreAssignment(form.roleId) && !requiresKitchenAssignment(form.roleId) && form.roleId ? (
                    <div className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                      Vai trò này không yêu cầu gán Store/Kitchen khi tạo hoặc cập nhật user.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={closeModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? 'Đang xử lý...' : modalMode === 'create' ? 'Tạo mới' : 'Cập nhật'}
                </button>
              </div>
            </form>
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
