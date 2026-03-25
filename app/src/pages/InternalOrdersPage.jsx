import { useState } from 'react'
import { Badge, EmptyState, Field, PageHeader, SectionCard } from '../components/ui'

const initialOrders = [
  {
    orderId: 6102,
    StoreId: 101,
    Status: 'PendingApproval',
    ExpectedDeliveryDate: '2026-03-19',
    OrderDetails: [
      { ProductId: 9001, QuantityOrdered: 12, QuantityConfirmed: 0, QuantityShipped: 0 },
      { ProductId: 9002, QuantityOrdered: 10, QuantityConfirmed: 0, QuantityShipped: 0 },
    ],
    RejectReason: '',
  },
  {
    orderId: 6104,
    StoreId: 204,
    Status: 'Approved',
    ExpectedDeliveryDate: '2026-03-20',
    OrderDetails: [{ ProductId: 9011, QuantityOrdered: 20, QuantityConfirmed: 18, QuantityShipped: 10 }],
    RejectReason: '',
  },
  {
    orderId: 6108,
    StoreId: 101,
    Status: 'Completed',
    ExpectedDeliveryDate: '2026-03-17',
    OrderDetails: [{ ProductId: 9020, QuantityOrdered: 8, QuantityConfirmed: 8, QuantityShipped: 8 }],
    RejectReason: '',
  },
]

const blankDetail = { ProductId: 0, QuantityOrdered: 0, QuantityConfirmed: 0, QuantityShipped: 0 }

export default function InternalOrdersPage() {
  const [orders, setOrders] = useState(initialOrders)
  const [query, setQuery] = useState({ storeId: '101', status: '' })
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrders[0].orderId)
  const [rejectReason, setRejectReason] = useState('')
  const [statusDraft, setStatusDraft] = useState('Approved')
  const [createForm, setCreateForm] = useState({
    StoreId: 101,
    ExpectedDeliveryDate: '2026-03-20',
    OrderDetails: [blankDetail],
  })

  const filteredOrders = !query.storeId
    ? []
    : orders.filter(
      (order) =>
        String(order.StoreId) === query.storeId &&
        (!query.status || order.Status.toLowerCase() === query.status.toLowerCase()),
    )

  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId) ?? null

  function updateDetailRow(index, key, value) {
    setCreateForm((current) => ({
      ...current,
      OrderDetails: current.OrderDetails.map((detail, detailIndex) =>
        detailIndex === index ? { ...detail, [key]: Number(value) } : detail,
      ),
    }))
  }

  function addDetailRow() {
    setCreateForm((current) => ({ ...current, OrderDetails: [...current.OrderDetails, blankDetail] }))
  }

  function removeDetailRow(index) {
    setCreateForm((current) => ({
      ...current,
      OrderDetails: current.OrderDetails.filter((_, detailIndex) => detailIndex !== index),
    }))
  }

  function createOrder() {
    const nextId = Math.max(...orders.map((order) => order.orderId)) + 1
    const created = { orderId: nextId, ...createForm, Status: 'Created', RejectReason: '' }
    setOrders([created, ...orders])
    setSelectedOrderId(nextId)
  }

  function patchSelected(mutator) {
    if (!selectedOrder) return
    setOrders(orders.map((order) => (order.orderId === selectedOrder.orderId ? mutator(order) : order)))
  }

  return (
    <div>
      <PageHeader pageKey="internalOrders" />

      <div className="space-y-6">
        <SectionCard title="Create Order">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="StoreId">
              <input
                className="app-input"
                type="number"
                value={createForm.StoreId}
                onChange={(event) => setCreateForm({ ...createForm, StoreId: Number(event.target.value) })}
              />
            </Field>
            <Field label="ExpectedDeliveryDate">
              <input
                className="app-input"
                type="date"
                value={createForm.ExpectedDeliveryDate}
                onChange={(event) => setCreateForm({ ...createForm, ExpectedDeliveryDate: event.target.value })}
              />
            </Field>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-[#e7dccd] bg-[#fffdf8] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#2f4031]">Order Lines</p>
              </div>
              <button className="app-button-secondary" onClick={addDetailRow}>
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add line
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {createForm.OrderDetails.map((detail, index) => (
                <div key={`${detail.ProductId}-${index}`} className="grid gap-3 rounded-[1.25rem] border border-[#ece1d2] bg-[#fff8ef] p-4 md:grid-cols-5">
                  {['ProductId', 'QuantityOrdered', 'QuantityConfirmed', 'QuantityShipped'].map((key) => (
                    <Field key={key} label={key}>
                      <input
                        className="app-input"
                        type="number"
                        value={detail[key]}
                        onChange={(event) => updateDetailRow(index, key, event.target.value)}
                      />
                    </Field>
                  ))}
                  <div className="flex items-end">
                    <button
                      className="app-button-danger w-full"
                      disabled={createForm.OrderDetails.length === 1}
                      onClick={() => removeDetailRow(index)}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button className="app-button-primary" onClick={createOrder}>
              <span className="material-symbols-outlined text-[18px]">send</span>
              Create internal order
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Order Management"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Store Id">
              <input
                className="app-input"
                type="number"
                value={query.storeId}
                onChange={(event) => setQuery({ ...query, storeId: event.target.value })}
              />
            </Field>
            <Field label="status">
              <select className="app-input" value={query.status} onChange={(event) => setQuery({ ...query, status: event.target.value })}>
                <option value="">All</option>
                <option value="Created">Created</option>
                <option value="PendingApproval">PendingApproval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
              </select>
            </Field>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-3">
              {filteredOrders.length ? (
                filteredOrders.map((order) => (
                  <button
                    key={order.orderId}
                    className={`w-full rounded-[1.4rem] border p-4 text-left ${order.orderId === selectedOrderId
                      ? 'border-[#c7d8c9] bg-[#eef7ef]'
                      : 'border-[#e6dccd] bg-[#fffdf8]'
                      }`}
                    onClick={() => setSelectedOrderId(order.orderId)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#2c3d2d]">Order #{order.orderId}</p>
                      <Badge tone={order.Status === 'Completed' ? 'green' : order.Status === 'Rejected' ? 'red' : 'amber'}>
                        {order.Status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Store {order.StoreId} | ETA {order.ExpectedDeliveryDate}</p>
                  </button>
                ))
              ) : (
                <EmptyState
                  title="No matching orders"
                  description="Try another filter."
                  icon="receipt_long"
                />
              )}
            </div>

            {selectedOrder ? (
              <div className="space-y-4 rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-[#243424]">Order #{selectedOrder.orderId}</h3>
                  </div>
                  <Badge tone="stone">Store {selectedOrder.StoreId}</Badge>
                </div>

                <div className="space-y-2">
                  {selectedOrder.OrderDetails.map((detail, index) => (
                    <div key={`${detail.ProductId}-${index}`} className="rounded-2xl border border-[#ece1d2] bg-[#fff8ef] p-3">
                      <p className="text-sm font-semibold text-[#2d3d2e]">Product {detail.ProductId}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Ordered {detail.QuantityOrdered} | Confirmed {detail.QuantityConfirmed} | Shipped {detail.QuantityShipped}
                      </p>
                    </div>
                  ))}
                </div>

                {selectedOrder.RejectReason ? (
                  <div className="rounded-2xl border border-[#efc9c1] bg-[#fff0ec] p-3 text-sm text-[#9a472e]">
                    Reject reason: {selectedOrder.RejectReason}
                  </div>
                ) : null}

                <Field label="Reject Reason">
                  <input className="app-input" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
                </Field>

                <Field label="Status">
                  <select className="app-input" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </Field>

                <div className="flex flex-wrap gap-3">
                  <button className="app-button-secondary" onClick={() => patchSelected((order) => ({ ...order, Status: 'Cancelled' }))}>
                    Cancel order
                  </button>
                  <button className="app-button-secondary" onClick={() => patchSelected((order) => ({ ...order, Status: 'Completed' }))}>
                    Confirm completed
                  </button>
                  <button className="app-button-primary" onClick={() => patchSelected((order) => ({ ...order, Status: 'Approved' }))}>
                    Approve
                  </button>
                  <button
                    className="app-button-danger"
                    onClick={() => patchSelected((order) => ({ ...order, Status: 'Rejected', RejectReason: rejectReason }))}
                  >
                    Reject
                  </button>
                  <button className="app-button-secondary" onClick={() => patchSelected((order) => ({ ...order, Status: statusDraft }))}>
                    Update status
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Select an order"
                description="Choose an order from the GET list to simulate the detail and PUT actions."
                icon="assignment"
              />
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
