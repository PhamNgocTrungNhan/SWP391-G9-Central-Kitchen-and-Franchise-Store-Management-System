import { useEffect, useState } from 'react'
import { Badge, Field, MetricsStrip, PageHeader, SectionCard } from '../components/ui'
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getCurrentUserRole } from '../utils/auth'

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

export default function DashboardPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const currentRole = getCurrentUserRole()
  const canAccessDashboardStats = currentRole === 'ADMIN' || currentRole === 'MANAGER'
  const [days, setDays] = useState('30')
  const [locationType, setLocationType] = useState('')
  const [productionData, setProductionData] = useState([])
  const [ordersData, setOrdersData] = useState([])
  const [inventory, setInventory] = useState({ lowStock: 0, outOfStock: 0, totalItems: 0, alertItems: [] })
  const [loading, setLoading] = useState(false)

  const fetchProductionData = async (selectedDays) => {
    if (!canAccessDashboardStats) {
      setProductionData([])
      return
    }

    const tk = getToken()
    if (!tk) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/Dashboard/production?days=${selectedDays}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        setProductionData([])
        return
      }

      const data = await response.json()
      if (Array.isArray(data)) {
        setProductionData(data)
      } else {
        setProductionData([])
      }
    } catch (error) {
      setProductionData([])
    } finally {
      setLoading(false)
    }
  }

  const fetchOrdersData = async () => {
    if (!canAccessDashboardStats) {
      setOrdersData([])
      return
    }

    const tk = getToken()
    if (!tk) {
      return
    }

    try {
      const response = await fetch(`${apiBase}/Dashboard/orders`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        setOrdersData([])
        return
      }

      const data = await response.json()
      if (Array.isArray(data)) {
        setOrdersData(data)
      } else {
        setOrdersData([])
      }
    } catch (error) {
      setOrdersData([])
    }
  }

  const fetchInventoryData = async () => {
    if (!canAccessDashboardStats) {
      return { lowStock: 0, outOfStock: 0, totalItems: 0, alertItems: [] }
    }

    const tk = getToken()
    if (!tk) return { lowStock: 0, outOfStock: 0, totalItems: 0, alertItems: [] }

    try {
      const query = locationType ? `?locationType=${encodeURIComponent(locationType)}` : ''
      const response = await fetch(`${apiBase}/Dashboard/inventory${query}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) {
        return { lowStock: 0, outOfStock: 0, totalItems: 0, alertItems: [] }
      }

      const data = await response.json()
      if (Array.isArray(data)) {
        let lowStock = 0
        let outOfStock = 0
        const totalItems = data.length
        const alertItems = []

        data.forEach(item => {
          const qty = item.quantity || item.currentQuantity || 0
          const min = item.minStockLevel || item.minimumStock || 0

          if (qty === 0) {
            outOfStock++
            alertItems.push({
              ...item,
              status: 'critical',
              statusLabel: 'Hết hàng'
            })
          } else if (qty < min) {
            lowStock++
            alertItems.push({
              ...item,
              status: 'low',
              statusLabel: 'Sắp hết'
            })
          }
        })

        return {
          lowStock,
          outOfStock,
          totalItems,
          alertItems: alertItems.slice(0, 10),
        }
      }

      return {
        lowStock: Number(data?.lowStock ?? 0),
        outOfStock: Number(data?.outOfStock ?? 0),
        totalItems: Number(data?.totalItems ?? 0),
        alertItems: Array.isArray(data?.alertItems) ? data.alertItems.slice(0, 10) : [],
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
      return { lowStock: 0, outOfStock: 0, totalItems: 0, alertItems: [] }
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchProductionData(days),
        fetchOrdersData(),
        fetchInventoryData().then(stats => {
          if (stats) {
            setInventory(stats)
          }
        })
      ])
    }
    loadData()
  }, [days, locationType, canAccessDashboardStats])

  const production = {
    planned: productionData.reduce((sum, item) => sum + (item.totalPlanned || 0), 0),
    actual: productionData.reduce((sum, item) => sum + (item.totalActual || 0), 0),
    completionRate: 0,
    totalBatches: productionData.length,
  }

  // Calculate completion rate
  if (production.planned > 0) {
    production.completionRate = ((production.actual / production.planned) * 100).toFixed(1)
  }

  // Map API status to UI labels
  const statusMap = {
    'CANCELLED': { label: 'Đã hủy', tone: 'red' },
    'COMPLETED': { label: 'Hoàn thành', tone: 'green' },
    'PROCESSING': { label: 'Đang xử lý', tone: 'amber' },
    'PRODUCED': { label: 'Đã sản xuất', tone: 'blue' },
    'RETURNED': { label: 'Đã trả', tone: 'red' },
    'SHIPPING': { label: 'Đang giao', tone: 'blue' },
  }

  const orderBuckets = ordersData.map(item => ({
    label: statusMap[item.status]?.label || item.status,
    value: item.totalOrders,
    tone: statusMap[item.status]?.tone || 'stone',
    status: item.status,
  }))

  const totalOrders = ordersData.reduce((sum, item) => sum + item.totalOrders, 0)

  const productionMetricItems = [
    {
      key: 'planned',
      label: 'Kế hoạch',
      value: Number(production.planned || 0).toLocaleString('vi-VN'),
      note: 'Số lượng dự kiến',
      icon: 'assignment',
      tone: 'blue',
    },
    {
      key: 'actual',
      label: 'Thực tế',
      value: Number(production.actual || 0).toLocaleString('vi-VN'),
      note: 'Đã sản xuất',
      icon: 'check_circle',
      tone: 'green',
    },
    {
      key: 'completionRate',
      label: 'Tỷ lệ hoàn thành',
      value: `${production.completionRate}%`,
      note: 'Thực tế/Kế hoạch',
      icon: 'percent',
      tone: 'purple',
    },
    {
      key: 'totalBatches',
      label: 'Tổng lô',
      value: Number(production.totalBatches || 0).toLocaleString('vi-VN'),
      note: 'Số lô sản xuất',
      icon: 'inventory_2',
      tone: 'amber',
    },
  ]

  const orderMetricItems = orderBuckets.map((item) => ({
    key: item.status || item.label,
    label: item.label,
    value: Number(item.value || 0).toLocaleString('vi-VN'),
    note: `${totalOrders > 0 ? ((item.value / totalOrders) * 100).toFixed(0) : 0}% tổng đơn`,
    icon: 'shopping_cart',
    tone: item.tone,
  }))

  // Colors for charts
  const COLORS = {
    'red': '#ef4444',
    'green': '#22c55e',
    'amber': '#f59e0b',
    'blue': '#3b82f6',
    'stone': '#78716c',
  }

  return (
    <div>
      <PageHeader
        pageKey="dashboard"
        aside={
          <div className="rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7858]">Query Filters</p>
            <div className="mt-4 grid gap-4">
              <Field label="Days">
                <select className="app-input" value={days} onChange={(event) => setDays(event.target.value)}>
                  <option value="7">7</option>
                  <option value="30">30</option>
                  <option value="90">90</option>
                </select>
              </Field>
              <Field label="Location Type">
                <select
                  className="app-input"
                  value={locationType}
                  onChange={(event) => setLocationType(event.target.value)}
                >
                  <option value="">All</option>
                  <option value="STORE">Store</option>
                  <option value="KITCHEN">Kitchen</option>
                </select>
              </Field>
            </div>
          </div>
        }
      />

      {!canAccessDashboardStats ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tài khoản hiện tại không có quyền xem thống kê Dashboard. Vui lòng đăng nhập bằng ADMIN hoặc MANAGER.
        </div>
      ) : null}

      <div className="space-y-6">
        <SectionCard title="Tổng quan sản xuất">
          {loading ? (
            <div className="text-sm text-slate-500">Đang tải...</div>
          ) : (
            <>
              <MetricsStrip items={productionMetricItems} columns="md:grid-cols-2 lg:grid-cols-4" />

              <div className="mt-6 rounded-[1.5rem] border border-[#e7dccd] bg-[#fffdf8] p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-[#324334]">Sản xuất theo ngày</p>
                  <Badge tone="stone">{productionData.length} ngày</Badge>
                </div>

                {productionData.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={productionData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7dccd" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        stroke="#8a7858"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#8a7858"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fffdf8',
                          border: '1px solid #e7dccd',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="totalPlanned"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Kế hoạch"
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalActual"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Thực tế"
                        dot={{ fill: '#22c55e', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="Tổng quan đơn hàng">
          {ordersData.length === 0 ? (
            <div className="text-sm text-slate-500">Chưa có dữ liệu đơn hàng</div>
          ) : (
            <>
              <MetricsStrip items={orderMetricItems} columns="md:grid-cols-2 lg:grid-cols-3" className="mb-6" />

              <div className="grid md:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="rounded-xl border border-[#e7dccd] bg-[#fffdf8] p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-[#324334] mb-4">Phân bổ đơn hàng</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={orderBuckets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7dccd" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        stroke="#8a7858"
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="#8a7858"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fffdf8',
                          border: '1px solid #e7dccd',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="value" name="Số đơn" radius={[8, 8, 0, 0]}>
                        {orderBuckets.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.tone]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="rounded-xl border border-[#e7dccd] bg-[#fffdf8] p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-[#324334] mb-4">Tỷ lệ trạng thái</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={orderBuckets}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {orderBuckets.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.tone]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fffdf8',
                          border: '1px solid #e7dccd',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center">
                    <p className="text-2xl font-bold text-[#324334]">{totalOrders}</p>
                    <p className="text-xs text-[#8a7858]">Tổng đơn hàng</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </SectionCard>
      </div>


    </div>
  )
}
