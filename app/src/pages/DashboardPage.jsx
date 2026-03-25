import { useEffect, useState } from 'react'
import { Badge, Field, PageHeader, SectionCard, StatCard } from '../components/ui'

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

  useEffect(() => {
    fetchProductionData(days)
  }, [days])

  const production = {
    planned: productionData.reduce((sum, item) => sum + (item.totalPlanned || 0), 0),
    actual: productionData.reduce((sum, item) => sum + (item.totalActual || 0), 0),
    batchesOpen: '0',
    batchesLate: '0',
  }
  const inventory = {
    lowStock: 0,
    transferReady: 0,
    storesAtRisk: 0,
  }

  const orderBuckets = [
    { label: 'Pending', value: 0, tone: 'amber' },
    { label: 'Approved', value: 0, tone: 'green' },
    { label: 'Rejected', value: 0, tone: 'red' },
    { label: 'Completed', value: 0, tone: 'blue' },
  ]

  const inventoryAlerts = []

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
        <SectionCard
          title="Production Overview"
        >
          {loading ? (
            <div className="text-sm text-slate-500">Loading...</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <StatCard label="Planned Quantity" value={String(production.planned)} tone="blue" />
                <StatCard label="Actual Quantity" value={String(production.actual)} tone="green" />
                <StatCard label="Open Batches" value={production.batchesOpen} tone="amber" />
                <StatCard label="Late Batches" value={production.batchesLate} tone="red" />
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-[#e7dccd] bg-[#fffdf8] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#324334]">Production by Date</p>
                  <Badge tone="stone">{productionData.length} days</Badge>
                </div>
                <div className="mt-5 space-y-3">
                  {productionData.slice(0, 5).map((item) => (
                    <div key={item.date}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.date}</span>
                        <span className="text-slate-500">
                          Actual: {item.totalActual} / Planned: {item.totalPlanned}
                        </span>
                      </div>
                      <div className="mt-2 rounded-full bg-[#ebe4d8] p-1">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${item.totalPlanned > 0 ? (item.totalActual / item.totalPlanned * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="Order Overview">
          <div className="grid gap-3">
            {orderBuckets.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[1.4rem] border border-[#e6dccd] bg-[#fffdf8] px-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[#2f3d31]">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">Internal order workflow status</p>
                </div>
                <Badge tone={item.tone}>{item.value}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Inventory Overview"
        className="mt-6"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Low Stock Items" value={String(inventory.lowStock)} tone="red" />
          <StatCard label="Transfer Ready" value={String(inventory.transferReady)} tone="amber" />
          <StatCard label="Stores at Risk" value={String(inventory.storesAtRisk)} tone="blue" />
        </div>

        {inventoryAlerts.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
            <table className="app-table">
              <thead>
                <tr>
                  <th className="app-th">Item</th>
                  <th className="app-th">Location</th>
                  <th className="app-th">Current Stock</th>
                  <th className="app-th">Alert</th>
                </tr>
              </thead>
              <tbody>
                {inventoryAlerts.map((row) => (
                  <tr key={`${row.item}-${row.place}`} className="bg-[#fffdf8]">
                    <td className="app-td font-medium">{row.item}</td>
                    <td className="app-td">{row.place}</td>
                    <td className="app-td">{row.stock}</td>
                    <td className="app-td">
                      <Badge tone={row.status === 'Ổn định' ? 'green' : row.status === 'Sắp hết hàng' ? 'red' : 'amber'}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
