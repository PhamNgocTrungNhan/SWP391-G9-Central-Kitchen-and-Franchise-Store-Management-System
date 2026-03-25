import { useEffect, useState } from 'react'
import { EmptyState, PageHeader, SectionCard } from '../components/ui'

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

  const fetchStock = async () => {
    const tk = getToken()
    if (!tk) {
      alert('No token! Please login again.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/Inventory/stock`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        alert(`API Error: ${response.status}`)
        setStock([])
        return
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        alert('API returned non-array data')
        setStock([])
        return
      }

      const normalized = data.map((item) => {
        const productName = item.product?.productName || `Product #${item.productId}`
        const location = item.location || 'N/A'
        const quantity = Number(item.quantity || 0)

        return {
          id: item.stockId || item.productId,
          productId: item.productId,
          product: productName,
          location,
          quantity,
          unit: item.product?.baseUnit || 'unit',
        }
      })

      setStock(normalized)
    } catch (error) {
      console.error('[Stock] Fetch error:', error)
      alert(`Error: ${error.message}`)
      setStock([])
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    const tk = getToken()
    if (!tk) {
      alert('No token! Please login again.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/Inventory/logs`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        alert(`API Error: ${response.status}`)
        setLogs([])
        return
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        alert('API returned non-array data')
        setLogs([])
        return
      }

      const normalized = data.map((item) => {
        const qty = Number(item.changeQuantity || 0)
        const productName = item.product?.productName || `Product #${item.productId}`

        let action = item.reason || 'Unknown'
        if (action.includes('SẢN XUẤT')) action = 'Material deduction'
        if (action.includes('NHẬP THÀNH PHẨM')) action = 'Finished product added'
        if (action.includes('XUẤT GIAO')) action = 'Transfer to store'
        if (action.includes('NHẬP NGUYÊN LIỆU') || action.includes('NHAP_TU_NHA_CUNG_CAP')) action = 'Material import'

        let actor = 'System'
        if (item.referenceType === 'PRODUCTION_BATCH' && item.referenceId) {
          actor = `Batch #${item.referenceId}`
        } else if (item.referenceType === 'INTERNAL_ORDER' && item.referenceId) {
          actor = `Order #${item.referenceId}`
        } else if (item.supplierId) {
          actor = `Supplier #${item.supplierId}`
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
      console.error('[Logs] Fetch error:', error)
      alert(`Error: ${error.message}`)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    if (activeTab === 'stock') {
      fetchStock()
    } else {
      fetchLogs()
    }
  }

  useEffect(() => {
    if (activeTab === 'stock') {
      fetchStock()
    } else {
      fetchLogs()
    }
  }, [activeTab])

  return (
    <div>
      <PageHeader pageKey="inventory" />

      <div className="mb-6">
        <div className="mb-4 flex gap-2 border-b border-slate-200 dark:border-slate-800">
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

        <SectionCard
          title={activeTab === 'stock' ? 'Inventory Stock' : 'Inventory Logs'}
          action={
            <button
              onClick={refreshData}
              disabled={loading}
              className="text-sm text-[#29392b] hover:text-[#4a5a4c] font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          }
        >
          {activeTab === 'stock' ? (
            stock.length === 0 ? (
              <EmptyState
                title="No stock found"
                description="No inventory stock records. Check Console for details."
                icon="inventory"
              />
            ) : (
              <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th className="app-th">Product ID</th>
                      <th className="app-th">Product</th>
                      <th className="app-th">Location</th>
                      <th className="app-th">Quantity</th>
                      <th className="app-th">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((item) => (
                      <tr key={item.id} className="bg-[#fffdf8]">
                        <td className="app-td">{item.productId}</td>
                        <td className="app-td font-medium">{item.product}</td>
                        <td className="app-td">{item.location}</td>
                        <td className="app-td">
                          <span className={item.quantity > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="app-td">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            logs.length === 0 ? (
              <EmptyState
                title="No logs found"
                description="No inventory changes recorded. Check Console for details."
                icon="history"
              />
            ) : (
              <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th className="app-th">ID</th>
                      <th className="app-th">Product</th>
                      <th className="app-th">Action</th>
                      <th className="app-th">Actor</th>
                      <th className="app-th">Quantity</th>
                      <th className="app-th">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="bg-[#fffdf8]">
                        <td className="app-td">{log.id}</td>
                        <td className="app-td font-medium">{log.product}</td>
                        <td className="app-td">{log.action}</td>
                        <td className="app-td">{log.actor}</td>
                        <td className="app-td">
                          <span className={log.quantity.startsWith('+') ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {log.quantity}
                          </span>
                        </td>
                        <td className="app-td text-xs">{log.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </SectionCard>
      </div>
    </div>
  )
}
