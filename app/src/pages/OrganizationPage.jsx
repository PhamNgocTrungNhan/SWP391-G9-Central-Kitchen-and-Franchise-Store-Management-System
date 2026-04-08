import { useState } from 'react'
import { Badge, Field, PageHeader, SectionCard } from '../components/ui'

const initialStores = [
  { StoreId: 101, StoreName: 'Downtown Express', Address: '12 Market St', Phone: '0901000101', IsActive: true },
  { StoreId: 204, StoreName: 'East Mall', Address: '88 River Ave', Phone: '0901000204', IsActive: true },
  { StoreId: 305, StoreName: 'Airport Hub', Address: 'Terminal 3', Phone: '0901000305', IsActive: false },
]

const initialKitchens = [
  { KitchenId: 1, KitchenName: 'Central Kitchen North', Address: '2 Factory Road' },
  { KitchenId: 2, KitchenName: 'Central Kitchen South', Address: '88 Beltway' },
]

function StoreForm({ form, setForm }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="StoreId">
        <input
          className="app-input"
          type="number"
          value={form.StoreId}
          onChange={(event) => setForm({ ...form, StoreId: Number(event.target.value) })}
        />
      </Field>
      <Field label="StoreName">
        <input className="app-input" value={form.StoreName} onChange={(event) => setForm({ ...form, StoreName: event.target.value })} />
      </Field>
      <Field label="Address" className="sm:col-span-2">
        <input className="app-input" value={form.Address} onChange={(event) => setForm({ ...form, Address: event.target.value })} />
      </Field>
      <Field label="Phone">
        <input className="app-input" value={form.Phone} onChange={(event) => setForm({ ...form, Phone: event.target.value })} />
      </Field>
      <Field label="IsActive">
        <select
          className="app-input"
          value={String(form.IsActive)}
          onChange={(event) => setForm({ ...form, IsActive: event.target.value === 'true' })}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </Field>
    </div>
  )
}

function KitchenForm({ form, setForm }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="KitchenId">
        <input
          className="app-input"
          type="number"
          value={form.KitchenId}
          onChange={(event) => setForm({ ...form, KitchenId: Number(event.target.value) })}
        />
      </Field>
      <Field label="KitchenName">
        <input className="app-input" value={form.KitchenName} onChange={(event) => setForm({ ...form, KitchenName: event.target.value })} />
      </Field>
      <Field label="Address" className="sm:col-span-2">
        <input className="app-input" value={form.Address} onChange={(event) => setForm({ ...form, Address: event.target.value })} />
      </Field>
    </div>
  )
}

export default function OrganizationPage() {
  const [mode, setMode] = useState('stores')
  const [stores, setStores] = useState(initialStores)
  const [kitchens, setKitchens] = useState(initialKitchens)
  const [selectedStoreId, setSelectedStoreId] = useState(initialStores[0].StoreId)
  const [selectedKitchenId, setSelectedKitchenId] = useState(initialKitchens[0].KitchenId)
  const [storeForm, setStoreForm] = useState(initialStores[0])
  const [kitchenForm, setKitchenForm] = useState(initialKitchens[0])

  function selectStore(store) {
    if (!store) {
      setSelectedStoreId(null)
      setStoreForm({ StoreId: 0, StoreName: '', Address: '', Phone: '', IsActive: true })
      return
    }

    setSelectedStoreId(store.StoreId)
    setStoreForm(store)
  }

  function selectKitchen(kitchen) {
    if (!kitchen) {
      setSelectedKitchenId(null)
      setKitchenForm({ KitchenId: 0, KitchenName: '', Address: '' })
      return
    }

    setSelectedKitchenId(kitchen.KitchenId)
    setKitchenForm(kitchen)
  }

  function createStore() {
    if (!storeForm.StoreId || !storeForm.StoreName.trim()) return
    const created = { ...storeForm, StoreName: storeForm.StoreName.trim() }
    setStores([...stores, created])
    selectStore(created)
  }

  function updateStore() {
    if (!selectedStoreId) return
    setStores(stores.map((store) => (store.StoreId === selectedStoreId ? { ...storeForm } : store)))
  }

  function deleteStore() {
    if (!selectedStoreId) return
    const remaining = stores.filter((store) => store.StoreId !== selectedStoreId)
    setStores(remaining)
    selectStore(remaining[0] ?? null)
  }

  function createKitchen() {
    if (!kitchenForm.KitchenId || !kitchenForm.KitchenName.trim()) return
    const created = { ...kitchenForm, KitchenName: kitchenForm.KitchenName.trim() }
    setKitchens([...kitchens, created])
    selectKitchen(created)
  }

  function updateKitchen() {
    if (!selectedKitchenId) return
    setKitchens(
      kitchens.map((kitchen) => (kitchen.KitchenId === selectedKitchenId ? { ...kitchenForm } : kitchen)),
    )
  }

  return (
    <div>
      <PageHeader pageKey="organization" />

      <div className="mb-6 flex flex-wrap gap-3">
        <button className={mode === 'stores' ? 'app-button-primary' : 'app-button-secondary'} onClick={() => setMode('stores')}>
          Stores
        </button>
        <button className={mode === 'kitchens' ? 'app-button-primary' : 'app-button-secondary'} onClick={() => setMode('kitchens')}>
          Kitchens
        </button>
      </div>

      {mode === 'stores' ? (
        <div className="space-y-6">
          <SectionCard title="Store List">
            <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
              <table className="app-table">
                <thead>
                  <tr>
                    <th className="app-th">StoreId</th>
                    <th className="app-th">StoreName</th>
                    <th className="app-th">Phone</th>
                    <th className="app-th">IsActive</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr
                      key={store.StoreId}
                      className={store.StoreId === selectedStoreId ? 'bg-[#eef7ef]' : 'bg-[#fffdf8]'}
                      onClick={() => selectStore(store)}
                    >
                      <td className="app-td font-medium">{store.StoreId}</td>
                      <td className="app-td">
                        <div>
                          <p className="font-medium">{store.StoreName}</p>
                          <p className="mt-1 text-xs text-slate-500">{store.Address}</p>
                        </div>
                      </td>
                      <td className="app-td">{store.Phone}</td>
                      <td className="app-td">
                        <Badge tone={store.IsActive ? 'green' : 'stone'}>{String(store.IsActive)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Store Editor">
            <StoreForm form={storeForm} setForm={setStoreForm} />
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="app-button-primary" onClick={createStore}>
                <span className="material-symbols-outlined text-[18px]">add_business</span>
                Create store
              </button>
              <button className="app-button-secondary" onClick={updateStore}>
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Update store
              </button>
              <button className="app-button-danger" onClick={deleteStore}>
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete store
              </button>
            </div>
          </SectionCard>
        </div>
      ) : (
        <div className="space-y-6">
          <SectionCard title="Kitchen List">
            <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
              <table className="app-table">
                <thead>
                  <tr>
                    <th className="app-th">KitchenId</th>
                    <th className="app-th">KitchenName</th>
                    <th className="app-th">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {kitchens.map((kitchen) => (
                    <tr
                      key={kitchen.KitchenId}
                      className={kitchen.KitchenId === selectedKitchenId ? 'bg-[#eef7ef]' : 'bg-[#fffdf8]'}
                      onClick={() => selectKitchen(kitchen)}
                    >
                      <td className="app-td font-medium">{kitchen.KitchenId}</td>
                      <td className="app-td">{kitchen.KitchenName}</td>
                      <td className="app-td">{kitchen.Address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Kitchen Editor">
            <KitchenForm form={kitchenForm} setForm={setKitchenForm} />
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="app-button-primary" onClick={createKitchen}>
                <span className="material-symbols-outlined text-[18px]">add_home_work</span>
                Create kitchen
              </button>
              <button className="app-button-secondary" onClick={updateKitchen}>
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Update kitchen
              </button>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}
