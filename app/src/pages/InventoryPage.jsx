import { useEffect, useState } from 'react'

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

export default function InventoryPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const [activeTab, setActiveTab] = useState('stock')
  const [stock, setStock] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const fetchStock = async () => {
    const tk = getToken()
    if (!tk) return

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/Inventory/stock`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        setStock([])
        return
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        setStock([])
        return
      }

      const normalized = data.map((item) => {
        const productName = item.product?.productName || item.product?.name || item.productName || `Sản phẩm #${item.productId}`
        const location = item.location || 'Bếp trung tâm #1'
        const quantity = Number(item.quantity || 0)

        return {
          id: item.stockId || item.productId,
          productId: item.productId,
          product: productName,
          location,
          quantity,
          unit: item.product?.baseUnit || item.baseUnit || 'unit',
        }
      })

      setStock(normalized)
    } catch (error) {
      setStock([])
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    const tk = getToken()
    if (!tk) return

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/Inventory/logs`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        setLogs([])
        return
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        setLogs([])
        return
      }

      const normalized = data.map((item) => {
        const qty = Number(item.changeQuantity || 0)
        const productName = item.product?.productName || item.product?.name || item.productName || `Sản phẩm #${item.productId}`

        let action = item.reason || 'Unknown'
        if (action.includes('SẢN XUẤT')) action = 'Trừ nguyên liệu sản xuất'
        if (action.includes('NHẬP THÀNH PHẨM')) action = 'Nhập thành phẩm'
        if (action.includes('XUẤT GIAO')) action = 'Xuất giao cửa hàng'
        if (action.includes('NHẬP NGUYÊN LIỆU') || action.includes('NHAP_TU_NHA_CUNG_CAP')) action = 'Nhập nguyên liệu'

        let actor = 'Hệ thống'
        if (item.referenceType === 'PRODUCTION_BATCH' && item.referenceId) {
          actor = `Mẻ SX #${item.referenceId}`
        } else if (item.referenceType === 'INTERNAL_ORDER' && item.referenceId) {
          actor = `Đơn hàng #${item.referenceId}`
        } else if (item.supplierId) {
          actor = `NCC #${item.supplierId}`
        }

        return {
          id: item.logId,
          product: productName,
          quantity: qty >= 0 ? `+${qty}` : `${qty}`,
          action,
          actor,
          date: toReadableDate(item.createdAt),
          type: qty >= 0 ? 'IN' : 'OUT',
        }
      })

      setLogs(normalized)
    } catch (error) {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    setCurrentPage(1)
    if (activeTab === 'stock') {
      fetchStock()
    } else {
      fetchLogs()
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    if (activeTab === 'stock') {
      fetchStock()
    } else {
      fetchLogs()
    }
  }, [activeTab])

  const currentData = activeTab === 'stock' ? stock : logs
  const totalPages = Math.ceil(currentData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = currentData.slice(startIndex, endIndex)

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[24px]">inventory</span>
          <h2 className="text-lg font-bold leading-tight">Quản lý tồn kho</h2>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          {loading ? 'Đang tải...' : 'Tải lại'}
        </button>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Tồn kho và lịch sử</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Theo dõi số lượng tồn kho và lịch sử thay đổi.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'stock'
                ? 'border-b-2 border-primary text-primary'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Tồn kho
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'logs'
                ? 'border-b-2 border-primary text-primary'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Lịch sử thay đổi
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {activeTab === 'stock' ? (
            stock.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">Không có dữ liệu tồn kho</div>
            ) : (
              <>
                <table className="w-full table-fixed text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="w-[35%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                      <th className="w-[25%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Vị trí</th>
                      <th className="w-[20%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tồn hiện tại</th>
                      <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn vị</th>
                      <th className="w-[10%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Cảnh báo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{item.product}</td>
                        <td className="px-4 py-3 text-sm">{item.location}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={item.quantity > 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{item.unit}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${item.quantity > 100 ? 'bg-emerald-100 text-emerald-700' : item.quantity > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {item.quantity > 100 ? '●' : item.quantity > 0 ? '●' : '●'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-sm text-slate-500">
                      Hiển thị {startIndex + 1}-{Math.min(endIndex, stock.length)} trong tổng số {stock.length} mục
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Trước
                      </button>
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Trang {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            logs.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">Không có lịch sử thay đổi</div>
            ) : (
              <>
                <table className="w-full table-fixed text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="w-[25%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                      <th className="w-[20%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Hành động</th>
                      <th className="w-[15%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Nguồn</th>
                      <th className="w-[12%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Số lượng</th>
                      <th className="w-[20%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thời gian</th>
                      <th className="w-[8%] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedData.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{log.product}</td>
                        <td className="px-4 py-3 text-sm">{log.action}</td>
                        <td className="px-4 py-3 text-sm">{log.actor}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={log.quantity.startsWith('+') ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {log.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{log.date}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${log.quantity.startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {log.quantity.startsWith('+') ? 'Nhập' : 'Xuất'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-sm text-slate-500">
                      Hiển thị {startIndex + 1}-{Math.min(endIndex, logs.length)} trong tổng số {logs.length} mục
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Trước
                      </button>
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Trang {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}
