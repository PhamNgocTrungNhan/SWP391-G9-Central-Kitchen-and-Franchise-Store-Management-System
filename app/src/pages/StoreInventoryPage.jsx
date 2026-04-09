import { useEffect, useMemo, useState } from 'react'
import { decodeJwtPayload, getStoredToken } from '../utils/auth'
import { Link } from 'react-router-dom'

function parseArrayData(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

function parseSafeNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toReadableDate(dateString) {
  if (!dateString) return 'N/A'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return String(dateString)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resolveStoreIdFromTokenOrStorage() {
  const direct = localStorage.getItem('store_id') || localStorage.getItem('storeId') || localStorage.getItem('current_store_id')
  if (String(direct || '').trim()) return Number(direct)

  const payload = decodeJwtPayload(getStoredToken()) || {}
  const claimStoreId = payload?.storeId || payload?.StoreId || payload?.store_id || payload?.['StoreId']
  if (String(claimStoreId || '').trim()) return Number(claimStoreId)

  return 0
}

function resolveInventoryStatus(row) {
  const current = parseSafeNumber(row?.currentQuantity ?? row?.CurrentQuantity, 0)
  const min = parseSafeNumber(row?.minimumQuantity ?? row?.minQuantity ?? row?.reorderLevel ?? row?.safetyStock, 0)

  if (current <= 0) return 'critical'
  if (min > 0 && current <= min) return 'low'
  if (min === 0 && current <= 10) return 'low'
  return 'ok'
}

function extractErrorMessage(data, fallback = 'Có lỗi xảy ra') {
  if (typeof data === 'string' && data.trim()) return data.trim()
  if (!data || typeof data !== 'object') return fallback
  if (typeof data.message === 'string' && data.message.trim()) return data.message
  if (typeof data.title === 'string' && data.title.trim()) return data.title
  if (typeof data.detail === 'string' && data.detail.trim()) return data.detail
  const firstError = Object.values(data.errors || {}).find((value) => Array.isArray(value) && value.length)
  if (firstError && firstError[0]) return String(firstError[0])
  return fallback
}

const statusBadge = {
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  low: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const statusLabel = {
  ok: 'Ổn định',
  low: 'Cần nhập thêm',
  critical: 'Hết hàng',
}

const outboundReasons = [
  { id: 'WASTE_EXPIRED', label: 'Hủy - Hết hạn' },
  { id: 'WASTE_DAMAGED', label: 'Hủy - Hư hỏng/Lỗi' },
  { id: 'RETURN_TO_KITCHEN', label: 'Xuất - Trả về kitchen' },
  { id: 'OTHER', label: 'Khác' },
]

export default function StoreInventoryPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

  const [storeId, setStoreId] = useState(() => resolveStoreIdFromTokenOrStorage() || 1)
  const [storeOptions, setStoreOptions] = useState([])
  const [storesLoading, setStoresLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)
  const [rows, setRows] = useState([])
  const [logs, setLogs] = useState([])

  const [showOutboundModal, setShowOutboundModal] = useState(false)
  const [outboundLoading, setOutboundLoading] = useState(false)
  const [outboundError, setOutboundError] = useState('')
  const [outboundForm, setOutboundForm] = useState({
    productId: '',
    quantity: '1',
    reason: outboundReasons[0].id,
    note: '',
  })

  const token = () => {
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

  const fetchStores = async () => {
    const tk = token()
    if (!tk) {
      setStoreOptions([])
      return
    }

    setStoresLoading(true)
    try {
      const response = await fetch(`${apiBase}/Organization/stores`, {
        method: 'GET',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${tk}`,
        },
      })

      const data = await response.json().catch(() => ([]))
      if (!response.ok) {
        setStoreOptions([])
        return
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : []

      const normalized = list
        .map((s) => {
          const id = parseSafeNumber(s?.storeId ?? s?.id, 0)
          if (!id) return null
          return {
            id,
            name: s?.storeName || s?.name || `Cửa hàng #${id}`,
            isActive: s?.isActive !== false,
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'))

      setStoreOptions(normalized)

      const current = Number(storeId)
      if (normalized.length > 0 && !normalized.some((s) => s.id === current)) {
        setStoreId(normalized[0].id)
      }
    } finally {
      setStoresLoading(false)
    }
  }

  const fetchStoreInventory = async (targetStoreId) => {
    setError('')
    setMessage(null)
    const tk = token()
    if (!tk) {
      setRows([])
      setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    const resolvedStoreId = Number(targetStoreId || storeId)
    if (!resolvedStoreId || resolvedStoreId < 1) {
      setRows([])
      setError('StoreId không hợp lệ.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/Inventory/store/${resolvedStoreId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(extractErrorMessage(data, 'Không thể tải kho cửa hàng.'))

      const recordList = parseArrayData(data?.data ?? data)
      const normalized = recordList.map((item) => {
        const productId = parseSafeNumber(item?.productId ?? item?.ProductId, 0)
        const currentQuantity = parseSafeNumber(item?.currentQuantity ?? item?.CurrentQuantity, 0)
        const minQuantity = parseSafeNumber(item?.minimumQuantity ?? item?.minQuantity ?? item?.reorderLevel ?? item?.safetyStock, 0)
        const productName = item?.productName || item?.ProductName || item?.product?.productName || item?.product?.name || `Sản phẩm #${productId || 'N/A'}`
        const baseUnit = item?.baseUnit || item?.BaseUnit || item?.product?.baseUnit || 'unit'
        const lastUpdated = item?.lastUpdated || item?.LastUpdated || item?.updatedAt || item?.modifiedAt || null

        const status = resolveInventoryStatus({ currentQuantity, minimumQuantity: minQuantity })

        return {
          id: parseSafeNumber(item?.inventoryId ?? item?.InventoryId ?? item?.id, productId),
          productId,
          productName,
          baseUnit,
          currentQuantity,
          minQuantity,
          lastUpdated,
          status,
        }
      })

      normalized.sort((a, b) => {
        if (a.status !== b.status) {
          const order = { critical: 0, low: 1, ok: 2 }
          return order[a.status] - order[b.status]
        }
        return a.productName.localeCompare(b.productName, 'vi')
      })

      setRows(normalized)

      const lowCount = normalized.filter((r) => r.status === 'low' || r.status === 'critical').length
      if (lowCount > 0) {
        setMessage({
          type: 'warning',
          text: `Có ${lowCount} sản phẩm đang dưới mức an toàn. Bạn có thể tạo đơn nhập từ kitchen.`,
        })
      }
    } catch (e) {
      setRows([])
      setError(e.message || 'Tải kho cửa hàng thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const fetchStoreLogs = async (targetStoreId) => {
    setError('')
    const tk = token()
    if (!tk) return

    const resolvedStoreId = Number(targetStoreId || storeId)
    if (!resolvedStoreId || resolvedStoreId < 1) return

    try {
      const response = await fetch(`${apiBase}/Inventory/logs`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const data = await response.json().catch(() => ([]))
      if (!response.ok) return

      const records = parseArrayData(data)
      const filtered = records
        .filter((item) => String(item?.locationType || '').toUpperCase() === 'STORE' && Number(item?.locationId) === resolvedStoreId)
        .map((item) => ({
          id: parseSafeNumber(item?.logId ?? item?.transactionId ?? item?.id, 0),
          productId: parseSafeNumber(item?.productId, 0),
          productName: item?.product?.productName || item?.product?.name || item?.productName || `Sản phẩm #${item?.productId || 'N/A'}`,
          quantityChange: parseSafeNumber(item?.changeQuantity ?? item?.quantityChanged ?? item?.quantity ?? item?.amount, 0),
          reason: item?.reason || item?.note || '',
          createdAt: item?.createdAt || item?.transactionDate || item?.timestamp || null,
          referenceType: item?.referenceType || '',
          referenceId: item?.referenceId,
        }))
        .filter((item) => item.id > 0)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

      setLogs(filtered)
    } catch {
      setLogs([])
    }
  }

  const refreshAll = async (targetStoreId) => {
    const resolvedStoreId = Number(targetStoreId || storeId)
    await Promise.all([
      fetchStoreInventory(resolvedStoreId),
      fetchStoreLogs(resolvedStoreId),
    ])
  }

  const openOutboundModal = () => {
    setOutboundError('')
    if (rows.length > 0) {
      setOutboundForm((prev) => ({
        ...prev,
        productId: prev.productId || String(rows[0].productId),
      }))
    }
    setShowOutboundModal(true)
  }

  const closeOutboundModal = () => {
    if (outboundLoading) return
    setShowOutboundModal(false)
    setOutboundError('')
  }

  const submitOutbound = async (e) => {
    e.preventDefault()
    setOutboundError('')
    setMessage(null)

    const tk = token()
    if (!tk) {
      setOutboundError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    const resolvedStoreId = Number(storeId)
    const productId = Number(outboundForm.productId || 0)
    const quantity = Number(outboundForm.quantity || 0)
    const reason = String(outboundForm.reason || '').trim()
    const note = String(outboundForm.note || '').trim()

    if (!resolvedStoreId || resolvedStoreId < 1) {
      setOutboundError('StoreId không hợp lệ.')
      return
    }
    if (!productId || productId < 1) {
      setOutboundError('Vui lòng chọn sản phẩm hợp lệ.')
      return
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setOutboundError('Số lượng phải > 0.')
      return
    }
    if (!reason) {
      setOutboundError('Vui lòng chọn lý do.')
      return
    }

    setOutboundLoading(true)
    try {
      const response = await fetch(`${apiBase}/Inventory/store/${resolvedStoreId}/outbound`, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tk}`,
        },
        body: JSON.stringify({
          productId,
          quantity,
          reason,
          note,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(extractErrorMessage(data, 'Xuất/Hủy kho thất bại.'))

      setShowOutboundModal(false)
      setOutboundForm({ productId: '', quantity: '1', reason: outboundReasons[0].id, note: '' })
      setMessage({ type: 'success', text: data?.message || 'Xuất/Hủy kho thành công.' })
      refreshAll(resolvedStoreId)
    } catch (err) {
      setOutboundError(err.message || 'Không thể xuất/hủy kho.')
    } finally {
      setOutboundLoading(false)
    }
  }

  useEffect(() => {
    const resolved = resolveStoreIdFromTokenOrStorage()
    if (resolved && resolved !== storeId) setStoreId(resolved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    refreshAll(storeId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  useEffect(() => {
    fetchStores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!showOutboundModal) return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [showOutboundModal])

  const summary = useMemo(() => {
    const total = rows.length
    const critical = rows.filter((r) => r.status === 'critical').length
    const low = rows.filter((r) => r.status === 'low').length
    const ok = rows.filter((r) => r.status === 'ok').length
    return { total, critical, low, ok }
  }, [rows])

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[24px]">inventory_2</span>
          <h2 className="text-lg font-bold leading-tight">Kho cửa hàng</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">Cửa hàng</span>
            <select
              value={String(storeId)}
              onChange={(e) => setStoreId(Number(e.target.value))}
              disabled={storesLoading || storeOptions.length === 0}
              className="h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold"
              title={storeOptions.length === 0 ? 'Không tải được danh sách cửa hàng' : 'Chọn cửa hàng để quản lý kho'}
            >
              {storeOptions.length === 0 ? (
                <option value={String(storeId)}>Store #{storeId}</option>
              ) : (
                storeOptions.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name} (#{s.id}){s.isActive ? '' : ' - Ngừng hoạt động'}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/store-orders"
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
            title="Tạo đơn nhập hàng từ kitchen"
          >
            <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
            Nhập từ kitchen
          </Link>
          <button
            type="button"
            onClick={openOutboundModal}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">remove_circle</span>
            Xuất/Hủy kho
          </button>
          <button
            type="button"
            onClick={() => refreshAll(storeId)}
            disabled={loading}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Tổng sản phẩm</p>
            <p className="mt-2 text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-900/10 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-red-700 dark:text-red-300">Hết hàng</p>
            <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-300">{summary.critical}</p>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-900/10 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">Dưới mức an toàn</p>
            <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">{summary.low}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-900/10 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Ổn định</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{summary.ok}</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg border ${message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : message.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{message.text}</span>
              <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Tồn kho hiện tại</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Nếu backend chưa có mức tối thiểu, hệ thống sẽ cảnh báo khi tồn ≤ 10.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-4 text-sm text-slate-500">Đang tải...</div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-4 text-sm text-slate-500">Không có dữ liệu tồn kho.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Tồn hiện tại</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Tối thiểu</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn vị</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Cập nhật</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold">{item.productName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">#{item.productId}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold">
                        <span className={item.status === 'critical' ? 'text-red-600 dark:text-red-400' : item.status === 'low' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>
                          {item.currentQuantity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {item.minQuantity > 0 ? item.minQuantity : '-'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{item.baseUnit}</td>
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">{toReadableDate(item.lastUpdated)}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusBadge[item.status]}`}>
                          {statusLabel[item.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Lịch sử biến động kho (Store)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hiển thị 30 giao dịch gần nhất của cửa hàng.</p>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="px-5 py-4 text-sm text-slate-500">Chưa có lịch sử biến động.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Thời gian</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Biến động</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Lý do</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Tham chiếu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.slice(0, 30).map((log) => (
                    <tr key={`${log.id}-${log.createdAt || 't'}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">{toReadableDate(log.createdAt)}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold">{log.productName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">#{log.productId}</p>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span className={`font-bold ${log.quantityChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                          {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">{log.reason || '-'}</td>
                      <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {log.referenceType ? `${log.referenceType}${log.referenceId ? ` #${log.referenceId}` : ''}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showOutboundModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4" onClick={closeOutboundModal}>
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Xuất/Hủy kho cửa hàng</h3>
              <button
                type="button"
                onClick={closeOutboundModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitOutbound} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Sản phẩm</label>
                <select
                  value={outboundForm.productId}
                  onChange={(e) => setOutboundForm((prev) => ({ ...prev, productId: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                  required
                >
                  <option value="">Chọn sản phẩm</option>
                  {rows.map((r) => (
                    <option key={r.productId} value={String(r.productId)}>
                      {r.productName} (tồn: {r.currentQuantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Số lượng</label>
                  <input
                    type="number"
                    min="0.0001"
                    step="0.01"
                    value={outboundForm.quantity}
                    onChange={(e) => setOutboundForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Lý do</label>
                  <select
                    value={outboundForm.reason}
                    onChange={(e) => setOutboundForm((prev) => ({ ...prev, reason: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
                    required
                  >
                    {outboundReasons.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ghi chú (tuỳ chọn)</label>
                <textarea
                  value={outboundForm.note}
                  onChange={(e) => setOutboundForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="w-full h-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                  placeholder="Ví dụ: lô lỗi, hết hạn, hư hỏng..."
                />
              </div>

              {outboundError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                  {outboundError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeOutboundModal}
                  className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={outboundLoading}
                  className="h-10 px-4 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {outboundLoading ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

