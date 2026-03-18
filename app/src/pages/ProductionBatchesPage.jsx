import { useState } from 'react'
import { Badge, EmptyState, Field, PageHeader, SectionCard } from '../components/ui'

const initialBatches = {
  4201: {
    id: 4201,
    ProductId: 9001,
    QuantityPlanned: 320,
    MfgDate: '2026-03-17',
    Status: 'Planned',
    QuantityActual: 0,
    allocations: [{ OrderId: 6102, AllocatedQuantity: 120 }],
  },
  4202: {
    id: 4202,
    ProductId: 9002,
    QuantityPlanned: 180,
    MfgDate: '2026-03-18',
    Status: 'InProgress',
    QuantityActual: 92,
    allocations: [],
  },
}

const blankAllocation = { OrderId: 0, AllocatedQuantity: 0 }

export default function ProductionBatchesPage() {
  const [batches, setBatches] = useState(initialBatches)
  const [managedId, setManagedId] = useState('4201')
  const [createForm, setCreateForm] = useState({
    ProductId: 9001,
    QuantityPlanned: 250,
    MfgDate: '2026-03-20',
  })
  const [statusForm, setStatusForm] = useState({ Status: 'InProgress', QuantityActual: 120 })
  const [allocations, setAllocations] = useState([{ OrderId: 6102, AllocatedQuantity: 60 }])

  const managedBatch = batches[managedId] ?? null

  function createBatch() {
    const nextId = Math.max(...Object.keys(batches).map(Number)) + 1
    setBatches({
      ...batches,
      [nextId]: {
        id: nextId,
        ...createForm,
        Status: 'Planned',
        QuantityActual: 0,
        allocations: [],
      },
    })
    setManagedId(String(nextId))
  }

  function updateBatch(mutator) {
    if (!managedBatch) return
    setBatches({ ...batches, [managedBatch.id]: mutator(managedBatch) })
  }

  function updateAllocation(index, key, value) {
    setAllocations((current) =>
      current.map((allocation, allocationIndex) =>
        allocationIndex === index ? { ...allocation, [key]: Number(value) } : allocation,
      ),
    )
  }

  return (
    <div>
      <PageHeader pageKey="productionBatches" />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Create Batch">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ProductId">
              <input
                className="app-input"
                type="number"
                value={createForm.ProductId}
                onChange={(event) => setCreateForm({ ...createForm, ProductId: Number(event.target.value) })}
              />
            </Field>
            <Field label="QuantityPlanned">
              <input
                className="app-input"
                type="number"
                value={createForm.QuantityPlanned}
                onChange={(event) => setCreateForm({ ...createForm, QuantityPlanned: Number(event.target.value) })}
              />
            </Field>
            <Field label="MfgDate" className="sm:col-span-2">
              <input
                className="app-input"
                type="date"
                value={createForm.MfgDate}
                onChange={(event) => setCreateForm({ ...createForm, MfgDate: event.target.value })}
              />
            </Field>
          </div>

          <div className="mt-5 flex gap-3">
            <button className="app-button-primary" onClick={createBatch}>
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Create batch
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Batch Actions">
          <Field label="Batch Id">
            <input className="app-input" type="number" value={managedId} onChange={(event) => setManagedId(event.target.value)} />
          </Field>

          {managedBatch ? (
            <div className="mt-5 space-y-5">
              <div className="rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b7958]">Selected Batch</p>
                    <h3 className="mt-2 font-display text-2xl font-bold text-[#243424]">Batch #{managedBatch.id}</h3>
                  </div>
                  <Badge tone="amber">{managedBatch.Status}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Product {managedBatch.ProductId} | Planned {managedBatch.QuantityPlanned} | Actual {managedBatch.QuantityActual}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
                <p className="text-sm font-semibold text-[#2e3f30]">Update Status</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Status">
                    <select
                      className="app-input"
                      value={statusForm.Status}
                      onChange={(event) => setStatusForm({ ...statusForm, Status: event.target.value })}
                    >
                      <option value="Planned">Planned</option>
                      <option value="InProgress">InProgress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </Field>
                  <Field label="QuantityActual">
                    <input
                      className="app-input"
                      type="number"
                      value={statusForm.QuantityActual}
                      onChange={(event) => setStatusForm({ ...statusForm, QuantityActual: Number(event.target.value) })}
                    />
                  </Field>
                </div>
                <div className="mt-4">
                  <button
                    className="app-button-secondary"
                    onClick={() =>
                      updateBatch((batch) => ({
                        ...batch,
                        Status: statusForm.Status,
                        QuantityActual: statusForm.QuantityActual,
                      }))
                    }
                  >
                    Update batch status
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#2e3f30]">Allocation</p>
                  <button className="app-button-secondary" onClick={() => setAllocations([...allocations, blankAllocation])}>
                    Add allocation
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {allocations.map((allocation, index) => (
                    <div key={`${allocation.OrderId}-${index}`} className="grid gap-3 rounded-[1.25rem] border border-[#ece1d2] bg-[#fff8ef] p-4 md:grid-cols-3">
                      <Field label="OrderId">
                        <input
                          className="app-input"
                          type="number"
                          value={allocation.OrderId}
                          onChange={(event) => updateAllocation(index, 'OrderId', event.target.value)}
                        />
                      </Field>
                      <Field label="AllocatedQuantity">
                        <input
                          className="app-input"
                          type="number"
                          value={allocation.AllocatedQuantity}
                          onChange={(event) => updateAllocation(index, 'AllocatedQuantity', event.target.value)}
                        />
                      </Field>
                      <div className="flex items-end">
                        <button className="app-button-danger w-full" onClick={() => setAllocations(allocations.filter((_, row) => row !== index))}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="app-button-primary"
                    onClick={() => updateBatch((batch) => ({ ...batch, allocations: allocations.filter((row) => row.OrderId) }))}
                  >
                    Allocate batch
                  </button>
                  <button className="app-button-danger" onClick={() => updateBatch((batch) => ({ ...batch, Status: 'Cancelled' }))}>
                    Cancel batch
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="Unknown batch id"
                description="Because backend has no read endpoint, the UI only unlocks action cards when a known local mock batch id is entered."
                icon="factory"
              />
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
