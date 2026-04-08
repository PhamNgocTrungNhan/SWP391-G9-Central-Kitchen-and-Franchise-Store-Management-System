import { useEffect, useMemo, useState } from 'react'
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

function normalizeCategories(raw) {
  return parseArrayData(raw)
    .map((item) => {
      const categoryId = Number(item?.categoryId ?? item?.id)
      if (!categoryId || categoryId < 1) return null

      return {
        categoryId,
        name: String(item?.name || item?.categoryName || `Danh mục ${categoryId}`).trim(),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

async function sendCategoryMutation(url, method, token, name) {
  const payloadVariants = [{ name }, { Name: name }]

  for (let index = 0; index < payloadVariants.length; index += 1) {
    const response = await fetch(url, {
      method,
      headers: {
        accept: '*/*',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadVariants[index]),
    })

    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      return { ok: true, data }
    }

    if (response.status !== 400 || index === payloadVariants.length - 1) {
      return {
        ok: false,
        data,
        errorMessage: data?.message || data?.title || 'Không thể xử lý danh mục.',
      }
    }
  }

  return { ok: false, data: {}, errorMessage: 'Không thể xử lý danh mục.' }
}

export default function CategoriesPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [notice, setNotice] = useState({ open: false, type: 'success', message: '' })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [createName, setCreateName] = useState('')
  const [editName, setEditName] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [deleteCategoryId, setDeleteCategoryId] = useState('')
  const [deleteCategoryName, setDeleteCategoryName] = useState('')

  const openNotice = (type, message) => setNotice({ open: true, type, message })
  const closeNotice = () => setNotice((prev) => ({ ...prev, open: false }))

  useEffect(() => {
    if (!notice.open) return undefined

    const timer = window.setTimeout(() => {
      closeNotice()
    }, 2800)

    return () => window.clearTimeout(timer)
  }, [notice.open, notice.message])

  const fetchCategories = async () => {
    const token = getToken()
    if (!token) {
      setCategories([])
      openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/Category`, {
        method: 'GET',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => [])
      if (!response.ok) {
        throw new Error(data?.message || data?.title || 'Không thể tải danh sách danh mục.')
      }

      setCategories(normalizeCategories(data))
    } catch (error) {
      setCategories([])
      openNotice('error', error.message || 'Tải danh mục thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setCreateName('')
    setShowCreateModal(true)
  }

  const openEditModal = (category) => {
    setEditCategoryId(String(category.categoryId))
    setEditName(category.name)
    setShowEditModal(true)
  }

  const openDeleteModal = (category) => {
    setDeleteCategoryId(String(category.categoryId))
    setDeleteCategoryName(category.name)
    setShowDeleteModal(true)
  }

  const createCategory = async () => {
    const token = getToken()
    if (!token) {
      openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    const name = String(createName || '').trim()
    if (!name) {
      openNotice('error', 'Vui lòng nhập tên danh mục.')
      return
    }

    setSubmitting(true)
    try {
      const result = await sendCategoryMutation(`${apiBase}/Category`, 'POST', token, name)
      if (!result.ok) {
        throw new Error(result.errorMessage || 'Không thể tạo danh mục.')
      }

      openNotice('success', result.data?.message || 'Tạo danh mục thành công.')
      setShowCreateModal(false)
      await fetchCategories()
    } catch (error) {
      openNotice('error', error.message || 'Tạo danh mục thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateCategory = async () => {
    const token = getToken()
    if (!token) {
      openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    const categoryId = Number(editCategoryId)
    const name = String(editName || '').trim()

    if (!categoryId || categoryId < 1) {
      openNotice('error', 'Danh mục cần cập nhật không hợp lệ.')
      return
    }

    if (!name) {
      openNotice('error', 'Vui lòng nhập tên danh mục.')
      return
    }

    setSubmitting(true)
    try {
      const result = await sendCategoryMutation(`${apiBase}/Category/${categoryId}`, 'PUT', token, name)
      if (!result.ok) {
        throw new Error(result.errorMessage || 'Không thể cập nhật danh mục.')
      }

      openNotice('success', result.data?.message || 'Cập nhật danh mục thành công.')
      setShowEditModal(false)
      await fetchCategories()
    } catch (error) {
      openNotice('error', error.message || 'Cập nhật danh mục thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteCategory = async () => {
    const token = getToken()
    if (!token) {
      openNotice('error', 'Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    const categoryId = Number(deleteCategoryId)
    if (!categoryId || categoryId < 1) {
      openNotice('error', 'Danh mục cần xóa không hợp lệ.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${apiBase}/Category/${categoryId}`, {
        method: 'DELETE',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.message || data?.title || 'Không thể xóa danh mục.')
      }

      openNotice('success', data?.message || 'Xóa danh mục thành công.')
      setShowDeleteModal(false)
      await fetchCategories()
    } catch (error) {
      openNotice('error', error.message || 'Xóa danh mục thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCategories = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return categories

    return categories.filter((category) => `${category.categoryId} ${category.name}`.toLowerCase().includes(keyword))
  }, [categories, searchTerm])

  const statsItems = useMemo(() => {
    const normalizedNames = categories.map((item) => String(item.name || '').trim()).filter(Boolean)
    const duplicateNameCount = Math.max(0, normalizedNames.length - new Set(normalizedNames.map((item) => item.toLowerCase())).size)
    const uniqueInitialCount = new Set(categories.map((item) => String(item.name || '').trim().charAt(0).toUpperCase()).filter(Boolean)).size

    return [
      {
        key: 'categories-total',
        label: 'Tổng danh mục',
        value: Number(categories.length || 0).toLocaleString('vi-VN'),
        note: 'Danh mục toàn hệ thống',
        icon: 'category',
        tone: 'blue',
      },
      {
        key: 'categories-duplicates',
        label: 'Tên bị trùng',
        value: Number(duplicateNameCount || 0).toLocaleString('vi-VN'),
        note: 'Danh mục trùng tên cần rà soát',
        icon: 'content_copy',
        tone: duplicateNameCount > 0 ? 'red' : 'green',
      },
      {
        key: 'categories-named',
        label: 'Tên hợp lệ',
        value: Number(normalizedNames.length || 0).toLocaleString('vi-VN'),
        note: 'Danh mục đã có tên đầy đủ',
        icon: 'checklist',
        tone: 'green',
      },
      {
        key: 'categories-initial',
        label: 'Nhóm ký tự',
        value: Number(uniqueInitialCount || 0).toLocaleString('vi-VN'),
        note: 'Số chữ cái đầu khác nhau',
        icon: 'sort_by_alpha',
        tone: 'amber',
      },
    ]
  }, [categories])

  useEffect(() => {
    fetchCategories()
  }, [])

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
      {notice.open ? (
        <div className="fixed top-4 right-4 z-[80] pointer-events-none">
          <div className="pointer-events-auto w-[min(92vw,24rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
            <div className="px-4 py-3 flex items-start gap-3">
              <span className={`material-symbols-outlined mt-0.5 ${notice.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {notice.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{notice.type === 'success' ? 'Thao tác thành công' : 'Có lỗi xảy ra'}</p>
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
      ) : null}

      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[24px]">category</span>
          <h2 className="text-lg font-bold leading-tight">Quản lý danh mục</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
            disabled={loading || submitting}
            className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            onClick={openCreateModal}
            disabled={submitting}
            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            + Thêm danh mục
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Danh sách danh mục</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quản lý nhóm sản phẩm dùng cho Product và Recipe/BOM.</p>
        </div>

        <MetricsStrip items={statsItems} columns="sm:grid-cols-3" />

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tìm kiếm</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã hoặc tên danh mục..."
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[680px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã danh mục</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên danh mục</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">Đang tải dữ liệu danh mục...</td>
                </tr>
              ) : null}
              {!loading && filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">Chưa có danh mục phù hợp.</td>
                </tr>
              ) : null}
              {!loading && filteredCategories.map((category) => (
                <tr key={category.categoryId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 text-sm font-semibold">{category.categoryId}</td>
                  <td className="px-5 py-3 text-sm">{category.name}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(category)}
                        disabled={submitting}
                        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => openDeleteModal(category)}
                        disabled={submitting}
                        className="h-8 px-3 rounded-lg border border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4" onClick={() => !submitting && setShowCreateModal(false)}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-semibold">Thêm danh mục</p>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              >
                Đóng
              </button>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tên danh mục</span>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ví dụ: Nguyên liệu tươi"
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={createCategory}
                disabled={submitting || !createName.trim()}
                className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? 'Đang tạo...' : 'Xác nhận tạo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEditModal ? (
        <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4" onClick={() => !submitting && setShowEditModal(false)}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-semibold">Cập nhật danh mục {editCategoryId}</p>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={submitting}
                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              >
                Đóng
              </button>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tên danh mục</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nhập tên danh mục"
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={submitting}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={updateCategory}
                disabled={submitting || !editName.trim()}
                className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteModal ? (
        <div className="fixed inset-0 z-[80] bg-slate-950/40 flex items-center justify-center p-4" onClick={() => !submitting && setShowDeleteModal(false)}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-semibold text-red-600 dark:text-red-400">Xác nhận xóa danh mục</p>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              >
                Đóng
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Bạn có chắc muốn xóa danh mục <span className="font-semibold">{deleteCategoryName || `${deleteCategoryId}`}</span> không?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Nếu danh mục đã được dùng trong sản phẩm, backend có thể từ chối thao tác xóa.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={deleteCategory}
                disabled={submitting}
                className="h-9 px-3 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
