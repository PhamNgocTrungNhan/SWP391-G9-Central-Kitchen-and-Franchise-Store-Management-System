import { useEffect, useMemo, useState } from 'react'
import { Badge, EmptyState, Field, PageHeader, SectionCard } from '../components/ui'
import { getApiBaseUrl } from '../utils/apiConfig'

const blankAllocation = { OrderId: 0, AllocatedQuantity: 0 }

export default function ProductionBatchesPage() {
  const apiBase = getApiBaseUrl()

  const [managedId, setManagedId] = useState('')
  const [createForm, setCreateForm] = useState({
    ProductId: 9001,
    QuantityPlanned: 250,
    MfgDate: new Date().toISOString().slice(0, 10),
  })
  const [statusForm, setStatusForm] = useState({ Status: 'IN_PROGRESS', QuantityActual: 120 })
  const [allocations, setAllocations] = useState([{ ...blankAllocation }])
  const [batchSnapshot, setBatchSnapshot] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [createLoading, setCreateLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [allocateLoading, setAllocateLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [recentBatches, setRecentBatches] = useState([])

  const managedBatchId = useMemo(() => Number(managedId), [managedId])

  const managedBatch = useMemo(() => {
    if (!managedBatchId || managedBatchId < 1) return null
    if (!batchSnapshot || batchSnapshot.id !== managedBatchId) {
      return { id: managedBatchId, ...statusForm, allocations }
    }
    return batchSnapshot
  }, [allocations, batchSnapshot, managedBatchId, statusForm])

  const statusLabelMap = {
    PLANNED: 'Kế hoạch',
    IN_PROGRESS: 'Đang sản xuất',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
  }

  function getToken() {
    const candidates = [
      localStorage.getItem('auth_token'),
      localStorage.getItem('token'),
      localStorage.getItem('access_token'),
      sessionStorage.getItem('auth_token'),
      sessionStorage.getItem('token'),
      sessionStorage.getItem('access_token'),
    ]
    const token = candidates.find((item) => String(item || '').trim())
    if (!token) return ''
    return String(token).replace(/^Bearer\s+/i, '').trim()
  }

  async function callApi(path, options = {}) {
    const token = getToken()
    if (!token) {
      throw new Error('Thiếu token đăng nhập. Vui lòng đăng nhập lại.')
    }

    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        accept: '*/*',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : await response.text().catch(() => '')

    if (!response.ok) {
      let validationMessage = ''
      if (typeof data === 'object' && data?.errors && typeof data.errors === 'object') {
        validationMessage = Object.values(data.errors)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .filter(Boolean)
          .join(' ')
      }

      const message =
        (typeof data === 'object' && (data?.message || data?.title || data?.error || validationMessage)) ||
        (typeof data === 'string' && data) ||
        `Yêu cầu thất bại (${response.status})`
      
      console.error('API Error:', { path, status: response.status, data })
      
      const error = new Error(message)
      error.status = response.status
      error.data = data
      throw error
    }

    return data
  }

  async function fetchRecentBatches() {
    const tk = getToken()
    if (!tk) return

    try {
      // Try to fetch recent batches - this might not be available in backend
      const data = await callApi('/ProductionBatches', {
        method: 'GET',
      })

      const batches = parseArrayData(data)
      setRecentBatches(batches.slice(0, 10)) // Show only 10 most recent
    } catch {
      // If API doesn't exist, just ignore
      setRecentBatches([])
    }
  }

  function parseArrayData(raw) {
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw?.items)) return raw.items
    if (Array.isArray(raw?.data)) return raw.data
    return []
  }

  async function createBatch() {
    setError('')
    setSuccess('')

    if (!createForm.ProductId || !createForm.QuantityPlanned || !createForm.MfgDate) {
      setError('Vui lòng nhập đầy đủ Mã sản phẩm, Số lượng kế hoạch và Ngày sản xuất.')
      return
    }

    setCreateLoading(true)
    try {
      const payload = {
        productId: Number(createForm.ProductId),
        quantityPlanned: Number(createForm.QuantityPlanned),
        mfgDate: `${createForm.MfgDate}T00:00:00`,
      }

      const data = await callApi('/ProductionBatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const newId = Number(data?.id || data?.batchId || data?.productionBatchId || 0)
      if (newId > 0) {
        setManagedId(String(newId))
        setBatchSnapshot({
          id: newId,
          ProductId: payload.productId,
          QuantityPlanned: payload.quantityPlanned,
          MfgDate: payload.mfgDate,
          Status: 'PLANNED',
          QuantityActual: 0,
          allocations: [],
        })
      }

      setSuccess((data && data.message) || 'Tạo mẻ sản xuất thành công.')
      
      // Refresh recent batches list
      fetchRecentBatches()
    } catch (requestError) {
      setError(requestError.message || 'Tạo mẻ sản xuất thất bại.')
    } finally {
      setCreateLoading(false)
    }
  }

  async function updateBatchStatus() {
    setError('')
    setSuccess('')

    if (!managedBatchId || managedBatchId < 1) {
      setError('Vui lòng nhập mã mẻ hợp lệ trước khi cập nhật trạng thái.')
      return
    }

    const statusValue = statusForm.Status
    const quantityActualValue = Number(statusForm.QuantityActual)

    // Validation: Khi hoàn thành mẻ, số lượng thực tế phải lớn hơn 0
    if (statusValue === 'COMPLETED' && (!quantityActualValue || quantityActualValue <= 0)) {
      setError('Phải nhập số lượng thực tế (lớn hơn 0) khi hoàn thành mẻ!')
      return
    }

    setStatusLoading(true)
    try {
      // Use simple payload format first
      const payload = {
        status: statusValue,
        quantityActual: quantityActualValue,
      }

      console.log('Updating batch status:', { managedBatchId, payload })

      const data = await callApi(`/ProductionBatches/${managedBatchId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      setBatchSnapshot((current) => ({
        ...(current && current.id === managedBatchId ? current : { id: managedBatchId }),
        Status: statusValue,
        QuantityActual: quantityActualValue,
      }))
      
      if (statusValue === 'IN_PROGRESS') {
        setSuccess((data && data.message) || 'Đã chuyển IN_PROGRESS. Backend sẽ đệ quy BOM, gom RAW và trừ tồn kho nguyên liệu.')
      } else if (statusValue === 'COMPLETED') {
        setSuccess((data && data.message) || `Hoàn thành mẻ sản xuất thành công! Số lượng thực tế: ${quantityActualValue}`)
      } else {
        setSuccess((data && data.message) || 'Cập nhật trạng thái thành công.')
      }
    } catch (requestError) {
      console.error('Error updating batch status:', requestError)
      setError(requestError.message || 'Cập nhật trạng thái thất bại.')
    } finally {
      setStatusLoading(false)
    }
  }

  async function allocateBatch() {
    setError('')
    setSuccess('')

    if (!managedBatchId || managedBatchId < 1) {
      setError('Vui lòng nhập mã mẻ hợp lệ trước khi gán mẻ.')
      return
    }

    const payload = allocations
      .map((row) => ({ orderId: Number(row.OrderId), allocatedQuantity: Number(row.AllocatedQuantity) }))
      .filter((row) => row.orderId > 0 && row.allocatedQuantity > 0)

    if (payload.length === 0) {
      setError('Cần ít nhất 1 dòng phân bổ hợp lệ (Mã đơn > 0 và Số lượng phân bổ > 0).')
      return
    }

    setAllocateLoading(true)
    try {
      let data
      try {
        data = await callApi(`/ProductionBatches/${managedBatchId}/allocate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (firstError) {
        const message = String(firstError?.message || '')
        const needsRequestsWrapper = /requests\s+field\s+is\s+required|requests/i.test(message)
        if (!needsRequestsWrapper) throw firstError

        data = await callApi(`/ProductionBatches/${managedBatchId}/allocate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: payload }),
        })
      }

      setBatchSnapshot((current) => ({
        ...(current && current.id === managedBatchId ? current : { id: managedBatchId }),
        allocations: payload,
      }))
      setSuccess((data && data.message) || 'Gán mẻ thành công.')
    } catch (requestError) {
      setError(requestError.message || 'Gán mẻ thất bại.')
    } finally {
      setAllocateLoading(false)
    }
  }

  async function cancelBatch() {
    setError('')
    setSuccess('')

    if (!managedBatchId || managedBatchId < 1) {
      setError('Vui lòng nhập mã mẻ hợp lệ trước khi hủy mẻ sản xuất.')
      return
    }

    setCancelLoading(true)
    try {
      const data = await callApi(`/ProductionBatches/${managedBatchId}/cancel`, {
        method: 'PUT',
      })

      setStatusForm((current) => ({ ...current, Status: 'CANCELLED' }))
      setBatchSnapshot((current) => ({
        ...(current && current.id === managedBatchId ? current : { id: managedBatchId }),
        Status: 'CANCELLED',
      }))
      setSuccess((data && data.message) || 'Đã hủy mẻ sản xuất.')
    } catch (requestError) {
      setError(requestError.message || 'Hủy mẻ sản xuất thất bại.')
    } finally {
      setCancelLoading(false)
    }
  }

  function updateAllocation(index, key, value) {
    setAllocations((current) =>
      current.map((allocation, allocationIndex) =>
        allocationIndex === index ? { ...allocation, [key]: Number(value) } : allocation,
      ),
    )
  }

  // Load recent batches on mount
  useEffect(() => {
    fetchRecentBatches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <PageHeader pageKey="productionBatches" />

      <div className="space-y-6">
        <SectionCard title="Tạo Mẻ Sản Xuất">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mã Sản Phẩm">
              <input
                className="app-input"
                type="number"
                value={createForm.ProductId}
                onChange={(event) => setCreateForm({ ...createForm, ProductId: Number(event.target.value) })}
              />
            </Field>
            <Field label="Số Lượng Kế Hoạch">
              <input
                className="app-input"
                type="number"
                value={createForm.QuantityPlanned}
                onChange={(event) => setCreateForm({ ...createForm, QuantityPlanned: Number(event.target.value) })}
              />
            </Field>
            <Field label="Ngày Sản Xuất">
              <input
                className="app-input"
                type="date"
                value={createForm.MfgDate}
                onChange={(event) => setCreateForm({ ...createForm, MfgDate: event.target.value })}
              />
            </Field>
          </div>

          <div className="mt-5 flex gap-3">
            <button className="app-button-primary" onClick={createBatch} disabled={createLoading}>
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              {createLoading ? 'Đang tạo...' : 'Tạo mẻ'}
            </button>
          </div>
        </SectionCard>

        {recentBatches.length > 0 && (
          <SectionCard title="Mẻ Sản Xuất Gần Đây">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Mã Mẻ</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Sản Phẩm</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Kế Hoạch</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Thực Tế</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Trạng Thái</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentBatches.map((batch) => (
                    <tr key={batch.batchId || batch.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-sm font-medium">#{batch.batchId || batch.id}</td>
                      <td className="px-4 py-3 text-sm">{batch.product?.productName || `Sản phẩm #${batch.productId}`}</td>
                      <td className="px-4 py-3 text-sm">{batch.quantityPlanned}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-600">{batch.quantityActual || 0}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge tone={batch.status === 'CANCELLED' ? 'red' : batch.status === 'COMPLETED' ? 'green' : 'amber'}>
                          {statusLabelMap[batch.status] || batch.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          className="text-primary hover:underline text-xs font-medium"
                          onClick={() => setManagedId(String(batch.batchId || batch.id))}
                        >
                          Chọn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        <SectionCard title="Thao Tác Mẻ">
          <Field label="Mã Mẻ">
            <input className="app-input" type="number" value={managedId} onChange={(event) => setManagedId(event.target.value)} />
          </Field>

          {managedBatchId > 0 ? (
            <div className="mt-5 space-y-5">
              <div className="rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b7958]">Mẻ Đang Chọn</p>
                    <h3 className="mt-2 font-display text-2xl font-bold text-[#243424]">Mẻ #{managedBatchId}</h3>
                  </div>
                  <Badge tone={statusForm.Status === 'CANCELLED' ? 'red' : 'amber'}>
                    {statusLabelMap[managedBatch?.Status] || statusLabelMap[statusForm.Status] || (managedBatch?.Status || statusForm.Status)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Sản phẩm {managedBatch?.ProductId || createForm.ProductId} | Kế hoạch {managedBatch?.QuantityPlanned || createForm.QuantityPlanned} | Thực tế {managedBatch?.QuantityActual ?? statusForm.QuantityActual}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
                <p className="text-sm font-semibold text-[#2e3f30]">Cập Nhật Trạng Thái</p>
                <p className="mt-1 text-xs text-slate-500">
                  Khi chuyển sang IN_PROGRESS, backend sẽ đệ quy BOM đến RAW, gom theo nguyên liệu và trừ tồn kho.
                </p>
                
                {statusForm.Status === 'IN_PROGRESS' && (
                  <div className="mt-3 space-y-2">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                      ℹ️ <strong>Lưu ý quan trọng:</strong> Trước khi chuyển sang IN_PROGRESS, đảm bảo:
                      <ul className="mt-1 ml-4 list-disc space-y-1">
                        <li>Sản phẩm đã có Recipe/BOM (công thức nguyên liệu)</li>
                        <li>Tồn kho nguyên liệu đủ để sản xuất</li>
                        <li>Hệ thống sẽ tự động trừ nguyên liệu khi chuyển trạng thái</li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      ⚠️ Nếu gặp lỗi 400, kiểm tra:
                      <ul className="mt-1 ml-4 list-disc">
                        <li>Sản phẩm có Recipe/BOM chưa? (Vào menu Recipes để tạo)</li>
                        <li>Nguyên liệu có đủ trong kho không? (Vào Inventory để kiểm tra)</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {statusForm.Status === 'COMPLETED' && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    ⚠️ Để hoàn thành mẻ, phải nhập số lượng thực tế (lớn hơn 0) khi hoàn thành mẻ!
                  </div>
                )}
                
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Trạng Thái">
                    <select
                      className="app-input"
                      value={statusForm.Status}
                      onChange={(event) => setStatusForm({ ...statusForm, Status: event.target.value })}
                    >
                      <option value="PLANNED">Kế hoạch</option>
                      <option value="IN_PROGRESS">Đang sản xuất</option>
                      <option value="COMPLETED">Hoàn thành</option>
                      <option value="CANCELLED">Đã hủy</option>
                    </select>
                  </Field>
                  <Field label="Số Lượng Thực Tế" required={statusForm.Status === 'COMPLETED'}>
                    <input
                      className={`app-input ${statusForm.Status === 'COMPLETED' && (!statusForm.QuantityActual || statusForm.QuantityActual <= 0) ? 'border-red-500 focus:border-red-500' : ''}`}
                      type="number"
                      min="0"
                      step="1"
                      value={statusForm.QuantityActual}
                      onChange={(event) => setStatusForm({ ...statusForm, QuantityActual: Number(event.target.value) })}
                      placeholder={statusForm.Status === 'COMPLETED' ? 'Bắt buộc > 0' : 'Nhập số lượng'}
                      required={statusForm.Status === 'COMPLETED'}
                    />
                    {statusForm.Status === 'COMPLETED' && (!statusForm.QuantityActual || statusForm.QuantityActual <= 0) && (
                      <p className="mt-1 text-xs text-red-600">Số lượng thực tế phải lớn hơn 0</p>
                    )}
                  </Field>
                </div>
                <div className="mt-4">
                  <button className="app-button-secondary" onClick={updateBatchStatus} disabled={statusLoading}>
                    {statusLoading ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#2e3f30]">Phân Bổ Mẻ</p>
                  <button className="app-button-secondary" onClick={() => setAllocations([...allocations, blankAllocation])}>
                    Thêm dòng phân bổ
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {allocations.map((allocation, index) => (
                    <div key={`${allocation.OrderId}-${index}`} className="grid gap-3 rounded-[1.25rem] border border-[#ece1d2] bg-[#fff8ef] p-4 md:grid-cols-3">
                      <Field label="Mã Đơn Hàng">
                        <input
                          className="app-input"
                          type="number"
                          value={allocation.OrderId}
                          onChange={(event) => updateAllocation(index, 'OrderId', event.target.value)}
                        />
                      </Field>
                      <Field label="Số Lượng Phân Bổ">
                        <input
                          className="app-input"
                          type="number"
                          value={allocation.AllocatedQuantity}
                          onChange={(event) => updateAllocation(index, 'AllocatedQuantity', event.target.value)}
                        />
                      </Field>
                      <div className="flex items-end">
                        <button className="app-button-danger w-full" onClick={() => setAllocations(allocations.filter((_, row) => row !== index))}>
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="app-button-primary" onClick={allocateBatch} disabled={allocateLoading}>
                    {allocateLoading ? 'Đang gán mẻ...' : 'Gán mẻ'}
                  </button>
                  <button className="app-button-danger" onClick={cancelBatch} disabled={cancelLoading}>
                    {cancelLoading ? 'Đang hủy...' : 'Hủy mẻ'}
                  </button>
                </div>

                {success ? <p className="mt-4 text-sm font-medium text-emerald-700">{success}</p> : null}
                {error ? <p className="mt-2 text-sm font-medium text-red-600">{error}</p> : null}
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="Nhập mã mẻ để thao tác"
                description="Backend chưa có API đọc danh sách mẻ, nên bạn cần nhập mã mẻ hợp lệ để mở các thao tác."
                icon="factory"
              />
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
