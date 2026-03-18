import { useState } from 'react'
import { Badge, EmptyState, Field, PageHeader, SectionCard } from '../components/ui'

const stockRows = [
  { item: 'All Purpose Flour', onHand: '420 kg', warehouse: 'Kitchen 1', status: 'Healthy' },
  { item: 'Mozzarella Cheese', onHand: '65 kg', warehouse: 'Kitchen 2', status: 'Low' },
  { item: 'Tomato Base', onHand: '180 L', warehouse: 'Kitchen 1', status: 'Healthy' },
]

const storeInventoryMap = {
  101: [
    { item: 'Mozzarella Cheese', stock: '3 kg', min: '10 kg' },
    { item: 'Tomato Base', stock: '12 L', min: '8 L' },
  ],
  204: [
    { item: 'Flour', stock: '8 kg', min: '20 kg' },
    { item: 'Sauce', stock: '1 L', min: '6 L' },
  ],
}

const inventoryLogs = [
  { id: 'LG-9001', type: 'IN', item: 'Flour', quantity: '+80 kg', actor: 'Kitchen 1' },
  { id: 'LG-9002', type: 'TRANSFER', item: 'Mozzarella Cheese', quantity: '-12 kg', actor: 'Order 6102' },
  { id: 'LG-9003', type: 'OUT', item: 'Tomato Base', quantity: '-8 L', actor: 'Store 101' },
]

const transferCandidates = {
  6102: { orderId: 6102, storeId: 101, lines: ['Mozzarella Cheese x12 kg', 'Tomato Base x10 L'] },
  6104: { orderId: 6104, storeId: 204, lines: ['Flour x20 kg'] },
}

export default function InventoryPage() {
  const [storeId, setStoreId] = useState('101')
  const [transferOrderId, setTransferOrderId] = useState('6102')

  const selectedStoreRows = storeInventoryMap[storeId]
  const transferPreview = transferCandidates[transferOrderId]

  return (
    <div>
      <PageHeader pageKey="inventory" />

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard title="Stock Overview">
          <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
            <table className="app-table">
              <thead>
                <tr>
                  <th className="app-th">Item</th>
                  <th className="app-th">On hand</th>
                  <th className="app-th">Warehouse</th>
                  <th className="app-th">Signal</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((row) => (
                  <tr key={row.item} className="bg-[#fffdf8]">
                    <td className="app-td font-medium">{row.item}</td>
                    <td className="app-td">{row.onHand}</td>
                    <td className="app-td">{row.warehouse}</td>
                    <td className="app-td">
                      <Badge tone={row.status === 'Healthy' ? 'green' : 'red'}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Store Inventory"
          action={
            <div className="w-full max-w-[220px]">
              <Field label="storeId">
                <input className="app-input" type="number" value={storeId} onChange={(event) => setStoreId(event.target.value)} />
              </Field>
            </div>
          }
        >
          {selectedStoreRows ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
              <table className="app-table">
                <thead>
                  <tr>
                    <th className="app-th">Item</th>
                    <th className="app-th">Current stock</th>
                    <th className="app-th">Minimum level</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStoreRows.map((row) => (
                    <tr key={row.item} className="bg-[#fffdf8]">
                      <td className="app-td font-medium">{row.item}</td>
                      <td className="app-td">{row.stock}</td>
                      <td className="app-td">{row.min}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No inventory found"
              description="Try another store id."
              icon="inventory"
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Inventory Logs">
          <div className="space-y-3">
            {inventoryLogs.map((log) => (
              <div key={log.id} className="rounded-[1.4rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#29392b]">{log.id}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {log.item} by {log.actor}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={log.type === 'TRANSFER' ? 'amber' : log.type === 'IN' ? 'green' : 'stone'}>{log.type}</Badge>
                    <span className="text-sm font-semibold">{log.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Transfer To Store">
          <div className="grid gap-4">
            <Field label="Order Id">
              <input
                className="app-input"
                type="number"
                value={transferOrderId}
                onChange={(event) => setTransferOrderId(event.target.value)}
              />
            </Field>

            {transferPreview ? (
              <div className="rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2f4031]">Transfer Details</p>
                    <p className="mt-1 text-sm text-slate-600">Order #{transferPreview.orderId} for Store {transferPreview.storeId}</p>
                  </div>
                  <Badge tone="amber">ready</Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {transferPreview.lines.map((line) => (
                    <div key={line} className="rounded-2xl border border-[#ece1d2] bg-[#fff8ef] px-3 py-2 text-sm">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                title="Unknown order id"
                description="Try another order id."
                icon="local_shipping"
              />
            )}

            <div className="flex flex-wrap gap-3">
              <button className="app-button-primary" disabled={!transferPreview}>
                <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                Transfer to store
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
