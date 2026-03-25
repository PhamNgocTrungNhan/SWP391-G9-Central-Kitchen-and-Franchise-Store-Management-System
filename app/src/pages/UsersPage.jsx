import { useState } from 'react'
import { Badge, Field, PageHeader, SectionCard } from '../components/ui'

const initialUsers = [
  { UserId: 1, Username: 'admin', PasswordHash: '***', FullName: 'System Admin', RoleId: 1, StoreId: null, KitchenId: null },
  { UserId: 7, Username: 'manager.north', PasswordHash: '***', FullName: 'North Manager', RoleId: 2, StoreId: null, KitchenId: 1 },
  { UserId: 19, Username: 'store.101', PasswordHash: '***', FullName: 'Store 101 Lead', RoleId: 3, StoreId: 101, KitchenId: null },
]

export default function UsersPage() {
  const [users, setUsers] = useState(initialUsers)
  const [selectedId, setSelectedId] = useState(initialUsers[0].UserId)
  const [form, setForm] = useState(initialUsers[0])

  function selectUser(user) {
    if (!user) {
      setSelectedId(null)
      setForm({
        UserId: 0,
        Username: '',
        PasswordHash: '',
        FullName: '',
        RoleId: null,
        StoreId: null,
        KitchenId: null,
      })
      return
    }

    setSelectedId(user.UserId)
    setForm(user)
  }

  function updateField(key, value) {
    setForm({ ...form, [key]: value })
  }

  function createUser() {
    if (!form.UserId || !form.Username.trim()) return
    const created = { ...form, Username: form.Username.trim() }
    setUsers([...users, created])
    selectUser(created)
  }

  function updateUser() {
    if (!selectedId) return
    setUsers(users.map((user) => (user.UserId === selectedId ? { ...form } : user)))
  }

  function deleteUser() {
    if (!selectedId) return
    const remaining = users.filter((user) => user.UserId !== selectedId)
    setUsers(remaining)
    selectUser(remaining[0] ?? null)
  }

  return (
    <div>
      <PageHeader pageKey="users" />

      <div className="space-y-6">
        <SectionCard title="User List">
          <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
            <table className="app-table">
              <thead>
                <tr>
                  <th className="app-th">UserId</th>
                  <th className="app-th">Username</th>
                  <th className="app-th">RoleId</th>
                  <th className="app-th">Assignment</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.UserId}
                    className={user.UserId === selectedId ? 'bg-[#eef7ef]' : 'bg-[#fffdf8]'}
                    onClick={() => selectUser(user)}
                  >
                    <td className="app-td font-medium">#{user.UserId}</td>
                    <td className="app-td">
                      <div>
                        <p className="font-medium">{user.Username}</p>
                        <p className="mt-1 text-xs text-slate-500">{user.FullName || 'No full name'}</p>
                      </div>
                    </td>
                    <td className="app-td">
                      <Badge tone="stone">Role {user.RoleId ?? '--'}</Badge>
                    </td>
                    <td className="app-td">
                      Store {user.StoreId ?? '--'} | Kitchen {user.KitchenId ?? '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="User Editor">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="UserId">
              <input className="app-input" type="number" value={form.UserId ?? ''} onChange={(event) => updateField('UserId', Number(event.target.value))} />
            </Field>
            <Field label="Username">
              <input className="app-input" value={form.Username ?? ''} onChange={(event) => updateField('Username', event.target.value)} />
            </Field>
            <Field label="PasswordHash">
              <input className="app-input" value={form.PasswordHash ?? ''} onChange={(event) => updateField('PasswordHash', event.target.value)} />
            </Field>
            <Field label="FullName">
              <input className="app-input" value={form.FullName ?? ''} onChange={(event) => updateField('FullName', event.target.value)} />
            </Field>
            <Field label="RoleId">
              <input className="app-input" type="number" value={form.RoleId ?? ''} onChange={(event) => updateField('RoleId', Number(event.target.value))} />
            </Field>
            <Field label="StoreId">
              <input className="app-input" type="number" value={form.StoreId ?? ''} onChange={(event) => updateField('StoreId', event.target.value ? Number(event.target.value) : null)} />
            </Field>
            <Field label="KitchenId" className="sm:col-span-2">
              <input className="app-input" type="number" value={form.KitchenId ?? ''} onChange={(event) => updateField('KitchenId', event.target.value ? Number(event.target.value) : null)} />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="app-button-primary" onClick={createUser}>
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Create user
            </button>
            <button className="app-button-secondary" onClick={updateUser}>
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Update user
            </button>
            <button className="app-button-danger" onClick={deleteUser}>
              <span className="material-symbols-outlined text-[18px]">person_remove</span>
              Delete user
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
