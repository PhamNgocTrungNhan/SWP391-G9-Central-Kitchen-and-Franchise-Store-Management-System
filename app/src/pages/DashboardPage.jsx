import { useState } from 'react'
import { Badge, Field, PageHeader, SectionCard, StatCard } from '../components/ui'

const productionByDays = {
  7: { planned: '1280', actual: '1214', batchesOpen: '4', batchesLate: '1' },
  30: { planned: '5180', actual: '5042', batchesOpen: '11', batchesLate: '2' },
  90: { planned: '15240', actual: '14872', batchesOpen: '17', batchesLate: '3' },
}

const orderBuckets = [
  { label: 'Pending approval', value: 6, tone: 'amber' },
  { label: 'Approved', value: 15, tone: 'green' },
  { label: 'Rejected', value: 2, tone: 'red' },
  { label: 'Completed', value: 19, tone: 'blue' },
]

const inventoryByLocation = {
  all: { lowStock: 12, transferReady: 6, storesAtRisk: 4 },
  store: { lowStock: 8, transferReady: 2, storesAtRisk: 4 },
  kitchen: { lowStock: 4, transferReady: 4, storesAtRisk: 0 },
}

const inventoryAlerts = [
  { item: 'Mozzarella Cheese', place: 'Store 101', stock: '3 kg', status: 'Low stock' },
  { item: 'Burger Sauce', place: 'Store 204', stock: '1 L', status: 'Transfer candidate' },
  { item: 'Tomato Base', place: 'Kitchen 2', stock: '18 L', status: 'Healthy' },
]

export default function DashboardPage() {
  const [days, setDays] = useState('30')
  const [locationType, setLocationType] = useState('')

  const production = productionByDays[days]
  const inventory = inventoryByLocation[locationType || 'all']

  return (
    <div>
      <PageHeader
        pageKey="dashboard"
        aside={
          <div className="rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7858]">Query controls</p>
            <div className="mt-4 grid gap-4">
              <Field label="days">
                <select className="app-input" value={days} onChange={(event) => setDays(event.target.value)}>
                  <option value="7">7</option>
                  <option value="30">30</option>
                  <option value="90">90</option>
                </select>
              </Field>
              <Field label="locationType">
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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Production summary"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard label="Planned quantity" value={production.planned} tone="blue" />
            <StatCard label="Actual quantity" value={production.actual} tone="green" />
            <StatCard label="Open batches" value={production.batchesOpen} tone="amber" />
            <StatCard label="Late batches" value={production.batchesLate} tone="red" />
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-[#e7dccd] bg-[#fffdf8] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#324334]">Planned vs actual output</p>
              <Badge tone="stone">no API chart endpoint</Badge>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                { label: 'Bread', planned: 92, actual: 88 },
                { label: 'Sauce', planned: 64, actual: 66 },
                { label: 'Frozen prep', planned: 70, actual: 63 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{row.label}</span>
                    <span className="text-slate-500">{row.actual}% actual</span>
                  </div>
                  <div className="mt-3 rounded-full bg-[#ebe4d8] p-1">
                    <div className="h-3 rounded-full bg-[#d7d2c7]">
                      <div className="h-3 rounded-full bg-primary" style={{ width: `${row.actual}%` }} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Planned {row.planned}%</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Order Summary">
          <div className="grid gap-3">
            {orderBuckets.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[1.4rem] border border-[#e6dccd] bg-[#fffdf8] px-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[#2f3d31]">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">Aligned with internal order workflow only</p>
                </div>
                <Badge tone={item.tone}>{item.value}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Inventory summary"
        className="mt-6"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Low stock items" value={String(inventory.lowStock)} tone="red" />
          <StatCard label="Transfer ready orders" value={String(inventory.transferReady)} tone="amber" />
          <StatCard label="Stores at risk" value={String(inventory.storesAtRisk)} tone="blue" />
        </div>

        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
          <table className="app-table">
            <thead>
              <tr>
                <th className="app-th">Item</th>
                <th className="app-th">Location</th>
                <th className="app-th">Current stock</th>
                <th className="app-th">Signal</th>
              </tr>
            </thead>
            <tbody>
              {inventoryAlerts.map((row) => (
                <tr key={`${row.item}-${row.place}`} className="bg-[#fffdf8]">
                  <td className="app-td font-medium">{row.item}</td>
                  <td className="app-td">{row.place}</td>
                  <td className="app-td">{row.stock}</td>
                  <td className="app-td">
                    <Badge tone={row.status === 'Healthy' ? 'green' : row.status === 'Low stock' ? 'red' : 'amber'}>
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
