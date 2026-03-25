import { useEffect, useState } from 'react'
import { Badge, Field, PageHeader, SectionCard, StatCard } from '../components/ui'
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
  const [days, setDays] = useState('30')
  const [locationType, setLocationType] = useState('')
  const [productionData, setProductionData] = useState([])
  const [ordersData, setOrdersData] = useState([])
  const [inventory, setInventory] = useState({ lowStock: 0, outOfStock: 0, totalItems: 0, alertItems: [] })
  const [loading, setLoading] = useState(false)

  const fetchProductionData = async (selectedDays) => {
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
    const tk = getToken()
    if (!tk) return

    try {
      // Fetch all inventory items
      const response = await fetch(`${apiBase}/Inventory`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      if (!response.ok) return

      const data = await response.json()
      if (!Array.isArray(data)) return

      // Calculate inventory stats and get alert items
      let lowStock = 0
      let outOfStock = 0
      let totalItems = data.length
      const alertItems = []

      data.forEach(item => {
        const qty = item.quantity || 0
        const min = item.minStockLevel || 0

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
        alertItems: alertItems.slice(0, 10) // Top 10 items
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
  }, [days])

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
                  <option value="store">Store</option>
                  <option value="kitchen">Kitchen</option>
                </select>
              </Field>
            </div>
          </div>
        }
      />

      <div className="space-y-6">
        <SectionCard title="Tổng quan sản xuất">
          {loading ? (
            <div className="text-sm text-slate-500">Đang tải...</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Kế hoạch</p>
                      <p className="mt-2 text-3xl font-bold text-blue-900">{production.planned}</p>
                      <p className="text-xs text-blue-600 mt-1">Số lượng dự kiến</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[28px]">assignment</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Thực tế</p>
                      <p className="mt-2 text-3xl font-bold text-green-900">{production.actual}</p>
                      <p className="text-xs text-green-600 mt-1">Đã sản xuất</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[28px]">check_circle</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">Tỷ lệ hoàn thành</p>
                      <p className="mt-2 text-3xl font-bold text-purple-900">{production.completionRate}%</p>
                      <p className="text-xs text-purple-600 mt-1">Thực tế/Kế hoạch</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[28px]">percent</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Tổng lô</p>
                      <p className="mt-2 text-3xl font-bold text-amber-900">{production.totalBatches}</p>
                      <p className="text-xs text-amber-600 mt-1">Số lô sản xuất</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-amber-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[28px]">inventory_2</span>
                    </div>
                  </div>
                </div>
              </div>

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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {orderBuckets.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[#e7dccd] bg-[#fffdf8] p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#8a7858]">{item.label}</p>
                        <p className="mt-1 text-2xl font-bold text-[#324334]">{item.value}</p>
                      </div>
                      <Badge tone={item.tone}>{totalOrders > 0 ? ((item.value / totalOrders) * 100).toFixed(0) : 0}%</Badge>
                    </div>
                  </div>
                ))}
              </div>

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

      <SectionCard title="Tổng quan tồn kho" className="mt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Hết hàng</p>
                <p className="mt-2 text-3xl font-bold text-red-900">{inventory.outOfStock}</p>
                <p className="text-xs text-red-600 mt-1">Số lượng = 0</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[28px]">error</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Sắp hết</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">{inventory.lowStock}</p>
                <p className="text-xs text-amber-600 mt-1">Dưới mức tối thiểu</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[28px]">warning</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Tổng mặt hàng</p>
                <p className="mt-2 text-3xl font-bold text-blue-900">{inventory.totalItems}</p>
                <p className="text-xs text-blue-600 mt-1">Trong kho</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[28px]">inventory</span>
              </div>
            </div>
          </div>
        </div>

        {inventory.alertItems && inventory.alertItems.length > 0 && (
          <div className="mt-6 rounded-xl border border-[#e7dccd] bg-white overflow-hidden shadow-sm">
            <div className="bg-[#fffdf8] px-4 py-3 border-b border-[#e7dccd]">
              <h3 className="text-sm font-semibold text-[#324334]">Cảnh báo tồn kho (Top 10)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Sản phẩm</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Vị trí</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Số lượng</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Tối thiểu</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.alertItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {item.productName || `Sản phẩm #${item.productId}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.locationName || `Vị trí #${item.locationId}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                        {item.quantity || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">
                        {item.minStockLevel || 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={item.status === 'critical' ? 'red' : 'amber'}>
                          {item.statusLabel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
