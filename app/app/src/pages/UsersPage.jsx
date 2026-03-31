import { useState, useEffect, useMemo } from 'react'

function getToken() {
  const candidates = [
    localStorage.getItem('auth_token'),
    localStorage.getItem('token'),
    localStorage.getItem('access_token'),
  ]
  const first = candidates.find((item) => String(item || '').trim())
  return first ? String(first).replace(/^Bearer\s+/i, '').trim() : ''
}

export default function UsersPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const [users, setUsers] = useState([])
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
        const usersArray = Array.isArray(data) ? data : []
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

  useEffect(() => {
    fetchUsers()
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

  const createUser = async () => {
    if (!form.username || !form.passwordHash || !form.roleId) {
      openNotice('error', 'Vui lòng điền đầy đủ: Tên đăng nhập, Mật khẩu, Vai trò')
      return
    }

    const tk = getToken()
    if (!tk) {
      openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${apiBase}/user`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: form.username,
          passwordHash: form.passwordHash,
          fullName: form.fullName || null,
          roleId: Number(form.roleId),
          storeId: form.storeId ? Number(form.storeId) : null,
          kitchenId: form.kitchenId ? Number(form.kitchenId) : null,
        }),
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
    if (!form.username || !form.roleId) {
      openNotice('error', 'Vui lòng điền đầy đủ: Tên đăng nhập, Vai trò')
      return
    }

    const tk = getToken()
    if (!tk) {
      openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${apiBase}/user/${selectedId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: form.username,
          passwordHash: form.passwordHash || '',
          fullName: form.fullName || null,
          roleId: Number(form.roleId),
          storeId: form.storeId ? Number(form.storeId) : null,
          kitchenId: form.kitchenId ? Number(form.kitchenId) : null,
        }),
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
      const response = await fetch(`${apiBase}/user/${userId}`, {
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Tổng người dùng', value: stats.total, icon: 'group', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Quản trị viên', value: stats.admins, icon: 'admin_panel_settings', color: 'text-red-600 dark:text-red-400' },
            { label: 'Quản lý', value: stats.managers, icon: 'manage_accounts', color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Nhân viên', value: stats.staff, icon: 'badge', color: 'text-teal-600 dark:text-teal-400' },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[32px] ${card.color}`}>{card.icon}</span>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

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
                    <td className="px-4 py-3 text-sm font-medium">#{user.userId}</td>
                    <td className="px-4 py-3 text-sm font-medium">{user.username}</td>
                    <td className="px-4 py-3 text-sm">{user.fullName || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(user.roleId)}`}>
                        {getRoleName(user.roleId)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.storeId && <span>Cửa hàng #{user.storeId}</span>}
                      {user.kitchenId && <span>Bếp #{user.kitchenId}</span>}
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
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Họ tên</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={form.fullName ?? ''}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Vai trò <span className="text-red-500">*</span>
                  </span>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={form.roleId ?? ''}
                    onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}
                  >
                    <option value="">-- Chọn vai trò --</option>
                    <option value="1">ADMIN</option>
                    <option value="2">MANAGER</option>
                    <option value="3">SUPPLY_COORDINATOR</option>
                    <option value="4">KITCHEN_STAFF</option>
                    <option value="5">STORE_STAFF</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Cửa hàng</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    type="number"
                    value={form.storeId ?? ''}
                    onChange={(e) => setForm({ ...form, storeId: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Để trống nếu không phân công"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Bếp</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    type="number"
                    value={form.kitchenId ?? ''}
                    onChange={(e) => setForm({ ...form, kitchenId: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Để trống nếu không phân công"
                  />
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
                onClick={modalMode === 'create' ? createUser : updateUser}
              >
                {submitting ? 'Đang xử lý...' : modalMode === 'create' ? 'Tạo mới' : 'Cập nhật'}
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
