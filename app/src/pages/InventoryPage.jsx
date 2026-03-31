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

  // Expired scan states
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState(null)
  const [expiredItems, setExpiredItems] = useState([])
  const [showExpiredModal, setShowExpiredModal] = useState(false)
  const [selectedExpiredItem, setSelectedExpiredItem] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)


  const fetchStock = async () => {
    const tk = getToken()
    if (!tk) return

    setLoading(true)
    try {
      // Fetch all products first to get correct names
      const productsRes = await fetch(`${apiBase}/Products`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const productsData = productsRes.ok ? await productsRes.json() : []
      const productMap = {}
      if (Array.isArray(productsData)) {
        productsData.forEach((p) => {
          productMap[p.productId] = p.productName || p.name || `Sản phẩm #${p.productId}`
        })
      }

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
        const productName = productMap[item.productId] || item.product?.productName || item.product?.name || item.productName || `Sản phẩm #${item.productId}`
        const location = item.location || item.locationName || 'Bếp trung tâm #1'
        const quantity = Number(item.currentQuantity || item.quantity || 0)

        return {
          id: item.inventoryId || item.stockId || item.productId,
          productId: item.productId,
          product: productName,
          location,
          quantity,
          unit: item.product?.baseUnit || item.baseUnit || 'unit',
        }
      })

      setStock(normalized)
    } catch {
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
      // Fetch all products first to get correct names
      const productsRes = await fetch(`${apiBase}/Products`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const productsData = productsRes.ok ? await productsRes.json() : []
      const productMap = {}
      if (Array.isArray(productsData)) {
        productsData.forEach((p) => {
          productMap[p.productId] = p.productName || p.name || `Sản phẩm #${p.productId}`
        })
      }

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
        const productName = productMap[item.productId] || item.product?.productName || item.product?.name || item.productName || `Sản phẩm #${item.productId}`

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
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }


  const handleScanExpired = async () => {
    const tk = getToken()
    if (!tk) {
      setMessage({ type: 'error', text: 'Vui lòng đăng nhập để thực hiện chức năng này' })
      return
    }

    setScanning(true)
    setMessage(null)
    setExpiredItems([])

    try {
      // Fetch all products
      const productsRes = await fetch(`${apiBase}/Products`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const productsData = productsRes.ok ? await productsRes.json() : []
      const productMap = {}
      if (Array.isArray(productsData)) {
        productsData.forEach((p) => {
          productMap[p.productId] = p.productName || p.name || `Sản phẩm #${p.productId}`
        })
      }

      // Fetch all batches
      const batchesRes = await fetch(`${apiBase}/ProductionBatches`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!batchesRes.ok) {
        setMessage({ type: 'error', text: 'Không thể tải dữ liệu mẻ sản xuất' })
        return
      }

      const batchesData = await batchesRes.json()

      if (!Array.isArray(batchesData)) {
        setMessage({ type: 'error', text: 'Dữ liệu mẻ sản xuất không hợp lệ' })
        return
      }

      // Filter completed batches with expDate
      const completedBatches = batchesData.filter(
        (b) => b.status === 'COMPLETED' && b.expDate
      )

      // FIFO: Sort by mfgDate ascending (oldest first)
      completedBatches.sort((a, b) => new Date(a.mfgDate) - new Date(b.mfgDate))

      const now = new Date()
      const expired = []

      for (const batch of completedBatches) {
        const expDate = new Date(batch.expDate)
        if (expDate < now) {
          const productName = productMap[batch.productId] || `Sản phẩm #${batch.productId}`
          expired.push({
            batchId: batch.batchId,
            batchCode: batch.batchCode,
            productId: batch.productId,
            productName,
            expiredQuantity: batch.actualQuantity || batch.plannedQuantity || 0,
            mfgDate: batch.mfgDate,
            expDate: batch.expDate,
          })
        }
      }

      if (expired.length === 0) {
        setMessage({ type: 'success', text: 'Không tìm thấy sản phẩm hết hạn sử dụng' })
      } else {
        setExpiredItems(expired)
        setShowExpiredModal(true)
        setMessage({ type: 'success', text: `Tìm thấy ${expired.length} sản phẩm hết hạn sử dụng` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi khi quét hàng hết hạn: ' + error.message })
    } finally {
      setScanning(false)
    }
  }

  const handleViewExpiredDetail = async (item) => {
    const tk = getToken()
    if (!tk) return

    setSelectedExpiredItem(item)
    setShowDetailModal(true)
    setDetailLoading(true)

    try {
      // Fetch all products
      const productsRes = await fetch(`${apiBase}/Products`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const productsData = productsRes.ok ? await productsRes.json() : []
      const productMap = {}
      if (Array.isArray(productsData)) {
        productsData.forEach((p) => {
          productMap[p.productId] = p.productName || p.name || `Sản phẩm #${p.productId}`
        })
      }

      // Fetch batch details
      const batchRes = await fetch(`${apiBase}/ProductionBatches/${item.batchId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!batchRes.ok) {
        setDetailLoading(false)
        return
      }

      const batchData = await batchRes.json()

      // Fetch recipe/BOM
      const recipeRes = await fetch(`${apiBase}/Recipes/product/${item.productId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      let recipeData = null
      if (recipeRes.ok) {
        recipeData = await recipeRes.json()
      }

      // Enrich batch data
      const enrichedBatch = {
        ...batchData,
        productName: productMap[batchData.productId] || `Sản phẩm #${batchData.productId}`,
        recipe: recipeData,
      }

      setSelectedExpiredItem(enrichedBatch)
    } catch (error) {
      console.error('Error fetching batch details:', error)
    } finally {
      setDetailLoading(false)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleScanExpired}
            disabled={scanning}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            {scanning ? 'Đang quét...' : 'Quét hàng hết hạn'}
          </button>
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Tồn kho và lịch sử</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Theo dõi số lượng tồn kho và lịch sử thay đổi.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

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


      {/* Expired Items Modal */}
      {showExpiredModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold">Danh sách sản phẩm hết hạn</h3>
              <button
                onClick={() => setShowExpiredModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Mã mẻ</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">SL hết hạn</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">NSX</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">HSD</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expiredItems.map((item) => (
                    <tr key={item.batchId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-sm font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-sm">{item.batchCode}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-semibold">{item.expiredQuantity}</td>
                      <td className="px-4 py-3 text-xs">{toReadableDate(item.mfgDate)}</td>
                      <td className="px-4 py-3 text-xs text-red-600">{toReadableDate(item.expDate)}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleViewExpiredDetail(item)}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowExpiredModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Detail Modal */}
      {showDetailModal && selectedExpiredItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold">Chi tiết sản phẩm hết hạn</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-auto flex-1 px-6 py-4">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-slate-500">Đang tải...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-red-600 text-[24px]">warning</span>
                      <div>
                        <h4 className="font-semibold text-red-800 dark:text-red-400">Cảnh báo hết hạn sử dụng</h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          Sản phẩm này đã hết hạn sử dụng và cần được xử lý theo quy định.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Mã mẻ sản xuất</label>
                      <p className="text-sm font-medium mt-1">{selectedExpiredItem.batchCode}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Sản phẩm</label>
                      <p className="text-sm font-medium mt-1">{selectedExpiredItem.productName}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">SL dự kiến</label>
                      <p className="text-sm font-medium mt-1">{selectedExpiredItem.plannedQuantity || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">SL thực tế</label>
                      <p className="text-sm font-medium mt-1 text-red-600">{selectedExpiredItem.actualQuantity || selectedExpiredItem.expiredQuantity || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Ngày sản xuất</label>
                      <p className="text-sm font-medium mt-1">{toReadableDate(selectedExpiredItem.mfgDate)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Hạn sử dụng</label>
                      <p className="text-sm font-medium mt-1 text-red-600">{toReadableDate(selectedExpiredItem.expDate)}</p>
                    </div>
                  </div>

                  {selectedExpiredItem.recipe && selectedExpiredItem.recipe.materials && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Nguyên liệu đã sử dụng (Công thức)</h4>
                      <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-800">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50">
                            <th className="px-3 py-2 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">Nguyên liệu</th>
                            <th className="px-3 py-2 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">SL yêu cầu</th>
                            <th className="px-3 py-2 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">Hao hụt (%)</th>
                            <th className="px-3 py-2 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">SL thực tế cần</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedExpiredItem.recipe.materials.map((mat, idx) => {
                            const actualNeeded = mat.quantityRequired * (1 + (mat.wasteAllowancePercent || 0) / 100)
                            return (
                              <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                                <td className="px-3 py-2 text-sm">{mat.materialName || `Material #${mat.materialId}`}</td>
                                <td className="px-3 py-2 text-sm">{mat.quantityRequired}</td>
                                <td className="px-3 py-2 text-sm">{mat.wasteAllowancePercent || 0}%</td>
                                <td className="px-3 py-2 text-sm font-semibold">{actualNeeded.toFixed(2)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
