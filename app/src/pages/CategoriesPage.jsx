import { useState } from 'react'
import { Badge, Field, PageHeader, SectionCard } from '../components/ui'

const initialCategories = [
  { id: 1, name: 'Bakery' },
  { id: 2, name: 'Sauce Base' },
  { id: 3, name: 'Frozen Prep' },
  { id: 4, name: 'Store Supply' },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState(initialCategories)
  const [selectedId, setSelectedId] = useState(initialCategories[0].id)
  const [form, setForm] = useState({ Name: initialCategories[0].name })

  function selectCategory(category) {
    if (!category) {
      setSelectedId(null)
      setForm({ Name: '' })
      return
    }

    setSelectedId(category.id)
    setForm({ Name: category.name })
  }

  function createCategory() {
    if (!form.Name.trim()) return

    const nextId = Math.max(...categories.map((category) => category.id)) + 1
    setCategories([...categories, { id: nextId, name: form.Name.trim() }])
    selectCategory(null)
  }

  function updateCategory() {
    if (!selectedId || !form.Name.trim()) return

    setCategories(
      categories.map((category) =>
        category.id === selectedId ? { ...category, name: form.Name.trim() } : category,
      ),
    )
  }

  function deleteCategory() {
    if (!selectedId) return

    const remaining = categories.filter((category) => category.id !== selectedId)
    setCategories(remaining)
    selectCategory(remaining[0] ?? null)
  }

  return (
    <div>
      <PageHeader pageKey="categories" />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Category List">
          <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
            <table className="app-table">
              <thead>
                <tr>
                  <th className="app-th">Id</th>
                  <th className="app-th">Name</th>
                  <th className="app-th">State</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const active = category.id === selectedId
                  return (
                    <tr
                      key={category.id}
                      className={active ? 'bg-[#eef7ef]' : 'bg-[#fffdf8]'}
                      onClick={() => selectCategory(active ? null : category)}
                    >
                      <td className="app-td font-medium">#{category.id}</td>
                      <td className="app-td">{category.name}</td>
                      <td className="app-td">
                        <Badge tone={active ? 'green' : 'stone'}>{active ? 'selected for PUT/DELETE' : 'listed'}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Category Editor">
          <div className="grid gap-5">
            <Field label="Name">
              <input
                className="app-input"
                value={form.Name}
                onChange={(event) => setForm({ Name: event.target.value })}
                placeholder="Enter category name"
              />
            </Field>

            <div className="rounded-[1.5rem] border border-[#e7dccd] bg-[#fffdf8] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#897959]">Selected Id</p>
              <p className="mt-3 font-display text-3xl font-bold text-[#273727]">{selectedId ? selectedId : '--'}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="app-button-primary" onClick={createCategory}>
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create category
              </button>
              <button className="app-button-secondary disabled:cursor-not-allowed disabled:opacity-50" disabled={!selectedId} onClick={updateCategory}>
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Update category
              </button>
              <button className="app-button-danger disabled:cursor-not-allowed disabled:opacity-50" disabled={!selectedId} onClick={deleteCategory}>
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete category
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
