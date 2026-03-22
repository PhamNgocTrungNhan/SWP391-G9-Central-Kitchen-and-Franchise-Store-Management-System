import { useEffect, useMemo, useState } from 'react'

const statusColors = {
  ok: 'bg-emerald-500',
  low: 'bg-amber-500',
  critical: 'bg-red-500',
}

const stockBg = {
  ok: '',
  low: 'bg-amber-50 dark:bg-amber-900/10',
  critical: 'bg-red-50 dark:bg-red-900/10',
}

const inventoryActionLabel = {
  IN: 'Nhập kho',
  OUT: 'Xuất kho',
  ADJUST: 'Điều chỉnh',
  TRANSFER_IN: 'Chuyển vào',
  TRANSFER_OUT: 'Chuyển ra',
  INITIAL_STOCK: 'Khởi tạo tồn kho',
}

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

function normalizeLocationType(locationType) {
  const raw = String(locationType || '').toUpperCase()
  if (raw === 'KITCHEN') return 'Bếp trung tâm'
  if (raw === 'STORE') return 'Cửa hàng'
  return locationType || 'N/A'
}

function toReadableDate(dateString) {
  if (!dateString) return 'N/A'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return dateString
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resolveInventoryStatus(row) {
  const current = parseSafeNumber(row?.currentQuantity, 0)
  const min = parseSafeNumber(row?.minimumQuantity ?? row?.minQuantity ?? row?.reorderLevel ?? row?.safetyStock, 0)

  if (current <= 0) return 'critical'
  if (min > 0 && current <= min) return 'low'
  if (min === 0 && current <= 10) return 'low'
  return 'ok'
}

function toInventoryRow(item, productNameById) {
  const productId = parseSafeNumber(item?.productId, 0)
  const min = parseSafeNumber(item?.minimumQuantity ?? item?.minQuantity ?? item?.reorderLevel ?? item?.safetyStock, 0)

  return {
    id: parseSafeNumber(item?.inventoryId ?? item?.id, productId),
    productId,
    productName: item?.product?.productName || item?.product?.name || productNameById[productId] || `Product #${productId || 'N/A'}`,
    locationType: normalizeLocationType(item?.locationType),
    locationId: parseSafeNumber(item?.locationId, 0),
    currentQuantity: parseSafeNumber(item?.currentQuantity, 0),
    minQuantity: min,
    lastUpdated: item?.lastUpdated || item?.updatedAt || item?.modifiedAt || null,
    status: resolveInventoryStatus(item),
  }
}

function toInventoryLogRow(item, productNameById) {
  const productId = parseSafeNumber(item?.productId, 0)
  const rawAction = String(item?.transactionType || item?.type || item?.action || '').toUpperCase()
  const rawReason = String(item?.reason || '').toUpperCase()
  const action = inventoryActionLabel[rawAction]
    || inventoryActionLabel[rawReason]
    || item?.transactionType
    || item?.type
    || item?.action
    || item?.reason
    || 'N/A'

  return {
    id: parseSafeNumber(item?.logId ?? item?.transactionId ?? item?.id, 0),
    productId,
    productName: item?.product?.productName || item?.product?.name || productNameById[productId] || `Product #${productId || 'N/A'}`,
    locationType: normalizeLocationType(item?.locationType),
    locationId: parseSafeNumber(item?.locationId, 0),
    action,
    quantityChange: parseSafeNumber(item?.changeQuantity ?? item?.quantityChanged ?? item?.quantity ?? item?.amount, 0),
    reason: item?.reason || '',
    referenceType: item?.referenceType || 'N/A',
    referenceId: item?.referenceId,
    createdAt: item?.createdAt || item?.transactionDate || item?.timestamp || null,
  }
}

export default function BatchTraceabilityPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [rows, setRows] = useState([])
  const [logs, setLogs] = useState([])
  const [productNameMap, setProductNameMap] = useState({})
  const [productFilter, setProductFilter] = useState('')

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

  const fetchProductMap = async () => {
    const tk = token()
    try {
      const response = await fetch(`${apiBase}/Products/manufactured`, {
        method: 'GET',
        headers: {
          accept: '*/*',
          ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
        },
      })

      const data = await response.json().catch(() => [])
      if (!response.ok) return

      const records = parseArrayData(data)
      const map = {}
      records.forEach((item) => {
        const id = Number(item?.productId || item?.id)
        if (!id) return
        const name = item?.productName || item?.name
        if (!name) return
        map[id] = name
      })
      setProductNameMap(map)
    } catch {
      setProductNameMap({})
    }
  }

  const fetchInventoryData = async () => {
    setError('')
    setInfo('')

    const tk = token()
    if (!tk) {
      setRows([])
      setLogs([])
      setError('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
      return
    }

    setLoading(true)
    try {
      const headers = {
        accept: '*/*',
        Authorization: `Bearer ${tk}`,
      }

      const inventoryRes = await fetch(`${apiBase}/Inventory/stock`, { method: 'GET', headers })
      const logsRes = await fetch(`${apiBase}/Inventory/logs`, { method: 'GET', headers })

      const inventoryJson = await inventoryRes.json().catch(() => [])
      const logsJson = await logsRes.json().catch(() => [])

      if (!inventoryRes.ok) {
        throw new Error(inventoryJson?.message || inventoryJson?.title || 'Không thể tải dữ liệu tồn kho.')
      }

      if (!logsRes.ok) {
        setInfo('Không thể tải lịch sử từ /Inventory/logs. Đang hiển thị tồn kho hiện tại.')
      }

      const normalizedRows = parseArrayData(inventoryJson)
        .map((item) => toInventoryRow(item, productNameMap))
        .filter((item) => item.productId > 0)

      const normalizedLogs = logsRes.ok
        ? parseArrayData(logsJson)
          .map((item) => toInventoryLogRow(item, productNameMap))
          .filter((item) => item.id > 0)
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 100)
        : []

      setRows(normalizedRows)
      setLogs(normalizedLogs)
    } catch (e) {
      setRows([])
      setLogs([])
      setError(e.message || 'Tải tồn kho thất bại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductMap()
  }, [])

  useEffect(() => {
    fetchInventoryData()
  }, [Object.keys(productNameMap).length])

  const productOptions = useMemo(() => {
    const map = new Map()
    rows.forEach((row) => {
      if (row.productId > 0) map.set(row.productId, row.productName)
    })
    logs.forEach((log) => {
      if (log.productId > 0 && !map.has(log.productId)) {
        map.set(log.productId, log.productName)
      }
    })

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [rows, logs])

  const filteredRows = useMemo(() => {
    if (!productFilter) return rows
    const selectedId = Number(productFilter)
    return rows.filter((row) => row.productId === selectedId)
  }, [rows, productFilter])

  const filteredLogs = useMemo(() => {
    if (!productFilter) return logs
    const selectedId = Number(productFilter)
    return logs.filter((log) => log.productId === selectedId)
  }, [logs, productFilter])

  const stats = useMemo(() => ({
    total: filteredRows.length,
    low: filteredRows.filter((row) => row.status === 'low').length,
    critical: filteredRows.filter((row) => row.status === 'critical').length,
    quantity: filteredRows.reduce((sum, row) => sum + Number(row.currentQuantity || 0), 0),
  }), [filteredRows])

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[24px]">inventory_2</span>
          <h2 className="text-lg font-bold leading-tight">Tồn kho và nhật ký biến động</h2>
        </div>
        <button className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm" onClick={fetchInventoryData}>
          {loading ? 'Đang tải...' : 'Tải lại'}
        </button>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[{ label: 'Sản phẩm', value: stats.total }, { label: 'Sắp hết', value: stats.low }, { label: 'Hết hàng', value: stats.critical }, { label: 'Tổng tồn', value: stats.quantity }].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-4">{card.label}</p>
              <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <label className="flex flex-col gap-1 max-w-md">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lọc theo sản phẩm</span>
            <select
              className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-primary"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
            >
              <option value="">Tất cả sản phẩm</option>
              {productOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {info ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
            {info}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-lg">Tồn kho hiện tại</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    {['Sản phẩm', 'Vị trí', 'Tồn hiện tại', 'Mức tối thiểu', 'Cập nhật', 'Mức cảnh báo'].map((h) => (
                      <th key={h} className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? <tr><td colSpan={6} className="px-5 py-8 text-center text-sm">Đang tải dữ liệu...</td></tr> : null}
                  {!loading && filteredRows.length === 0 ? <tr><td colSpan={6} className="px-5 py-8 text-center text-sm">Không có dữ liệu tồn kho.</td></tr> : null}
                  {!loading && filteredRows.map((row) => (
                    <tr key={`${row.id}-${row.productId}`} className={stockBg[row.status]}>
                      <td className="px-5 py-4 text-sm font-medium">{row.productName}</td>
                      <td className="px-5 py-4 text-sm">{row.locationType} #{row.locationId || 'N/A'}</td>
                      <td className="px-5 py-4 text-sm font-semibold">{row.currentQuantity}</td>
                      <td className="px-5 py-4 text-sm">{row.minQuantity}</td>
                      <td className="px-5 py-4 text-sm">{toReadableDate(row.lastUpdated)}</td>
                      <td className="px-5 py-4 text-sm">
                        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusColors[row.status]}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-lg">Nhật ký biến động tồn kho</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    {['Thời gian', 'Sản phẩm', 'Loại', 'Số lượng', 'Vị trí', 'Tham chiếu'].map((h) => (
                      <th key={h} className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? <tr><td colSpan={6} className="px-5 py-8 text-center text-sm">Đang tải dữ liệu...</td></tr> : null}
                  {!loading && filteredLogs.length === 0 ? <tr><td colSpan={6} className="px-5 py-8 text-center text-sm">Không có lịch sử log.</td></tr> : null}
                  {!loading && filteredLogs.map((log) => (
                    <tr key={`${log.id}-${log.createdAt || 't'}`}>
                      <td className="px-5 py-4 text-sm">{toReadableDate(log.createdAt)}</td>
                      <td className="px-5 py-4 text-sm font-medium">{log.productName}</td>
                      <td className="px-5 py-4 text-sm">{log.action}</td>
                      <td className={`px-5 py-4 text-sm font-semibold ${log.quantityChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                      </td>
                      <td className="px-5 py-4 text-sm">{log.locationType} #{log.locationId || 'N/A'}</td>
                      <td className="px-5 py-4 text-sm">{log.referenceType} {log.referenceId ? `#${log.referenceId}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
