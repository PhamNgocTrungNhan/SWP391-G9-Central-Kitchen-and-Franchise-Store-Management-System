import { useCallback, useMemo, useState } from 'react'
import { Badge, EmptyState, Field, SectionCard } from '../components/ui'
import { fetchMockApi, getMockApiBaseUrl } from '../utils/mockApi'

function formatCell(value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function MockApiPage() {
  const baseUrl = useMemo(() => getMockApiBaseUrl(), [])
  const [endpoint, setEndpoint] = useState('')
  const [rows, setRows] = useState(null)
  const [rawJson, setRawJson] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const columns = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) return []
    const keys = new Set()
    rows.forEach((row) => {
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        Object.keys(row).forEach((k) => keys.add(k))
      }
    })
    return Array.from(keys)
  }, [rows])

  const load = useCallback(async () => {
    const path = String(endpoint || '').trim()
    setError('')
    setRawJson(null)
    if (!path) {
      setRows(null)
      setError('Nhập tên endpoint (resource) trên MockAPI, ví dụ: products')
      return
    }

    setLoading(true)
    try {
      const data = await fetchMockApi(path)
      if (Array.isArray(data)) {
        setRows(data)
        setRawJson(null)
      } else if (data && typeof data === 'object') {
        setRows([data])
        setRawJson(null)
      } else {
        setRows(null)
        setRawJson(data)
      }
    } catch (e) {
      setRows(null)
      setRawJson(null)
      const status = e?.status
      const msg = e?.message || 'Không tải được dữ liệu'
      setError(status ? `${msg} (HTTP ${status})` : msg)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  return (
    <div>
      <section className="mb-6">
        <div className="app-card relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative space-y-2">
            <h1 className="font-display text-[1.9rem] font-bold tracking-tight text-[#203224] sm:text-[2.2rem]">
              Dữ liệu MockAPI
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-[#5c6b52]">
              Gọi REST từ MockAPI và hiển thị trên giao diện. URL gốc:{' '}
              <span className="font-mono text-xs text-[#324334]">{baseUrl}</span>
              <span className="font-mono text-xs text-[#8a7858]">/{'{endpoint}'}</span>
            </p>
          </div>
        </div>
      </section>

      <SectionCard
        title="Truy vấn endpoint"
        action={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#c7d8c9] bg-[#eef7ef] px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-[#e2f0e4] disabled:opacity-60"
          >
            {loading ? 'Đang tải…' : 'Tải dữ liệu'}
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Endpoint (tên resource MockAPI)">
            <input
              className="app-input font-mono text-sm"
              placeholder="vd: products, orders, …"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </Field>
          <p className="text-xs text-[#8a7858] md:pb-2">
            Chỉ nhập phần sau domain; không gõ toàn URL.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-[#efc5bd] bg-[#fff0ec] px-4 py-3 text-sm text-[#a4482a]">
            {error}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Kết quả" className="mt-6">
        {loading && <p className="text-sm text-slate-500">Đang tải…</p>}

        {!loading && rawJson !== null && (
          <pre className="max-h-[480px] overflow-auto rounded-xl border border-[#e7dccd] bg-[#fffdf8] p-4 font-mono text-xs text-[#324334]">
            {typeof rawJson === 'string' ? rawJson : JSON.stringify(rawJson, null, 2)}
          </pre>
        )}

        {!loading && Array.isArray(rows) && rows.length === 0 && (
          <EmptyState
            title="Danh sách rỗng"
            description="Endpoint trả về mảng không có phần tử. Thêm bản ghi trên mockapi.io hoặc đổi endpoint."
            icon="inbox"
          />
        )}

        {!loading && Array.isArray(rows) && rows.length > 0 && columns.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-[#e7dccd]">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#e7dccd] bg-[#fff8ee]">
                  {columns.map((col) => (
                    <th key={col} className="whitespace-nowrap px-3 py-2 font-semibold text-[#324334]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row?.id ?? i} className="border-b border-[#f0e8dc] last:border-0 hover:bg-[#fffdf8]">
                    {columns.map((col) => (
                      <td key={col} className="max-w-[280px] truncate px-3 py-2 text-[#4a5c46]" title={formatCell(row?.[col])}>
                        {formatCell(row?.[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-[#e7dccd] bg-[#fffdf8] px-3 py-2">
              <Badge tone="stone">{rows.length} bản ghi</Badge>
            </div>
          </div>
        )}

        {!loading && rows === null && !error && !rawJson && (
          <p className="text-sm text-slate-500">Nhập endpoint và bấm «Tải dữ liệu».</p>
        )}
      </SectionCard>
    </div>
  )
}
