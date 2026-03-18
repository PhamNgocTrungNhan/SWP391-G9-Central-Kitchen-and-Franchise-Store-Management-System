import { useState } from 'react'
import { Badge, EmptyState, Field, PageHeader, SectionCard } from '../components/ui'

const initialRecipes = [
  { id: 11, ParentProductId: 501, MaterialId: 9001, QuantityRequired: 2.5, WasteAllowancePercent: 3 },
  { id: 12, ParentProductId: 501, MaterialId: 9002, QuantityRequired: 1.2, WasteAllowancePercent: 4 },
  { id: 13, ParentProductId: 702, MaterialId: 9011, QuantityRequired: 8, WasteAllowancePercent: 6 },
]

export default function RecipesPage() {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [parentProductId, setParentProductId] = useState('501')
  const [selectedId, setSelectedId] = useState(11)
  const [form, setForm] = useState({
    ParentProductId: 501,
    MaterialId: 9001,
    QuantityRequired: 2.5,
    WasteAllowancePercent: 3,
  })

  const visibleRecipes = recipes.filter((recipe) => String(recipe.ParentProductId) === parentProductId)

  function setBlankForm(parentValue) {
    setForm({
      ParentProductId: Number(parentValue || 0),
      MaterialId: 0,
      QuantityRequired: 0,
      WasteAllowancePercent: 0,
    })
  }

  function selectRecipe(recipe) {
    if (!recipe) {
      setSelectedId(null)
      setBlankForm(parentProductId)
      return
    }

    setSelectedId(recipe.id)
    setForm({
      ParentProductId: recipe.ParentProductId,
      MaterialId: recipe.MaterialId,
      QuantityRequired: recipe.QuantityRequired,
      WasteAllowancePercent: recipe.WasteAllowancePercent,
    })
  }

  function handleParentChange(value) {
    setParentProductId(value)
    const nextRecipe = recipes.find((recipe) => String(recipe.ParentProductId) === value)
    if (nextRecipe) {
      setSelectedId(nextRecipe.id)
      setForm({
        ParentProductId: nextRecipe.ParentProductId,
        MaterialId: nextRecipe.MaterialId,
        QuantityRequired: nextRecipe.QuantityRequired,
        WasteAllowancePercent: nextRecipe.WasteAllowancePercent,
      })
    } else {
      setSelectedId(null)
      setBlankForm(value)
    }
  }

  function createRecipe() {
    if (!form.ParentProductId || !form.MaterialId) return
    const nextId = Math.max(...recipes.map((recipe) => recipe.id)) + 1
    const created = { id: nextId, ...form }
    setRecipes([...recipes, created])
    setSelectedId(nextId)
    setParentProductId(String(form.ParentProductId))
    selectRecipe(created)
  }

  function updateRecipe() {
    if (!selectedId) return
    setRecipes(recipes.map((recipe) => (recipe.id === selectedId ? { id: selectedId, ...form } : recipe)))
    setParentProductId(String(form.ParentProductId))
  }

  function deleteRecipe() {
    if (!selectedId) return
    const remaining = recipes.filter((recipe) => recipe.id !== selectedId)
    setRecipes(remaining)
    const nextRecipe = remaining.find((recipe) => String(recipe.ParentProductId) === parentProductId)
    if (nextRecipe) {
      selectRecipe(nextRecipe)
    } else {
      selectRecipe(null)
    }
  }

  return (
    <div>
      <PageHeader pageKey="recipes" />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Recipe List"
          action={
            <div className="w-full max-w-[220px]">
              <Field label="parentProductId">
                <input
                  className="app-input"
                  type="number"
                  value={parentProductId}
                  onChange={(event) => handleParentChange(event.target.value)}
                />
              </Field>
            </div>
          }
        >
          {parentProductId ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
              <table className="app-table">
                <thead>
                  <tr>
                    <th className="app-th">RecipeId</th>
                    <th className="app-th">MaterialId</th>
                    <th className="app-th">QuantityRequired</th>
                    <th className="app-th">WasteAllowancePercent</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecipes.map((recipe) => (
                    <tr
                      key={recipe.id}
                      className={recipe.id === selectedId ? 'bg-[#eef7ef]' : 'bg-[#fffdf8]'}
                      onClick={() => selectRecipe(recipe)}
                    >
                      <td className="app-td font-medium">#{recipe.id}</td>
                      <td className="app-td">{recipe.MaterialId}</td>
                      <td className="app-td">{recipe.QuantityRequired}</td>
                      <td className="app-td">{recipe.WasteAllowancePercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="parentProductId is required"
              description="The backend only exposes recipe lookup by parent product id, so the list stays hidden until this value is filled."
            />
          )}
        </SectionCard>

        <SectionCard title="Recipe Editor">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ParentProductId">
              <input
                className="app-input"
                type="number"
                value={form.ParentProductId}
                onChange={(event) => setForm({ ...form, ParentProductId: Number(event.target.value) })}
              />
            </Field>
            <Field label="MaterialId">
              <input
                className="app-input"
                type="number"
                value={form.MaterialId}
                onChange={(event) => setForm({ ...form, MaterialId: Number(event.target.value) })}
              />
            </Field>
            <Field label="QuantityRequired">
              <input
                className="app-input"
                type="number"
                step="0.1"
                value={form.QuantityRequired}
                onChange={(event) => setForm({ ...form, QuantityRequired: Number(event.target.value) })}
              />
            </Field>
            <Field label="WasteAllowancePercent">
              <input
                className="app-input"
                type="number"
                step="0.1"
                value={form.WasteAllowancePercent}
                onChange={(event) => setForm({ ...form, WasteAllowancePercent: Number(event.target.value) })}
              />
            </Field>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-[#e7dccd] bg-[#fffdf8] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7958]">Selected Recipe Id</p>
            <p className="mt-3 font-display text-3xl font-bold text-[#243425]">{selectedId ? selectedId : '--'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="stone">GET uses parentProductId only</Badge>
              <Badge tone="amber">PUT / DELETE use id route param</Badge>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="app-button-primary" onClick={createRecipe}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create recipe line
            </button>
            <button className="app-button-secondary" onClick={updateRecipe}>
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Update recipe line
            </button>
            <button className="app-button-danger" onClick={deleteRecipe}>
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Delete recipe line
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
