/**
 * Chu kỳ "agent" phía client: gom GET nhiều nguồn dữ liệu vận hành để làm mới UI / log / snapshot.
 */

export const AGENT_CLIENT_VERSION = '3'

/** sessionStorage: bản snapshot cuối (tab hiện tại) */
export const AGENT_SNAPSHOT_STORAGE_KEY = 'ck_agent_snapshot_v3'

export const AGENT_SYNC_SOURCES = [
  { id: 'dash-production', label: 'Sản xuất (7 ngày)', path: '/Dashboard/production?days=7' },
  { id: 'dash-orders', label: 'Tóm tắt đơn hàng', path: '/Dashboard/orders' },
  { id: 'dash-inventory', label: 'Tóm tắt tồn kho', path: '/Dashboard/inventory' },
  { id: 'inventory-stock', label: 'Tồn kho chi tiết', path: '/Inventory/stock' },
  { id: 'inventory-logs', label: 'Nhật ký tồn kho', path: '/Inventory/logs' },
  { id: 'production-batches', label: 'Danh sách mẻ SX', path: '/ProductionBatches' },
  { id: 'internal-orders', label: 'Đơn nội bộ (danh sách)', path: '/internal-orders' },
  { id: 'organization-stores', label: 'Cửa hàng', path: '/Organization/stores' },
  { id: 'organization-kitchens', label: 'Bếp trung tâm', path: '/Organization/kitchens' },
  { id: 'products-raw', label: 'Nguyên liệu (RAW)', path: '/Products/raw' },
  { id: 'products-all', label: 'Sản phẩm (tất cả)', path: '/Products' },
  { id: 'categories', label: 'Danh mục', path: '/Category' },
  { id: 'suppliers', label: 'Nhà cung cấp', path: '/Suppliers' },
  { id: 'transactions-summary', label: 'Tổng hợp giao dịch', path: '/Transactions/summary' },
  { id: 'agent-status', label: 'AgentSync status (server)', path: '/AgentSync/status' },
]

function summarizeBody(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return '(rỗng)'
  try {
    const v = JSON.parse(trimmed)
    if (Array.isArray(v)) return `${v.length} bản ghi`
    if (v && typeof v === 'object') {
      const keys = Object.keys(v)
      return `Object (${keys.length} khóa)`
    }
    return String(v).slice(0, 80)
  } catch {
    return trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed
  }
}

/**
 * @param {string} apiBase
 * @param {string} token
 * @param {{ id: string, path: string }} source
 */
export async function fetchAgentSource(apiBase, token, source) {
  const base = String(apiBase || '').replace(/\/+$/, '')
  const path = source.path.startsWith('/') ? source.path : `/${source.path}`
  const url = `${base}${path}`
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  const ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0)
  const text = await res.text()
  return {
    id: source.id,
    ok: res.ok,
    status: res.status,
    ms,
    summary: summarizeBody(text),
  }
}

export async function runAgentSyncCycle(apiBase, token, sources = AGENT_SYNC_SOURCES) {
  const at = new Date().toISOString()
  const rows = []
  for (const src of sources) {
    try {
      rows.push(await fetchAgentSource(apiBase, token, src))
    } catch (e) {
      rows.push({
        id: src.id,
        ok: false,
        status: 0,
        ms: 0,
        summary: e?.message || 'Lỗi mạng',
      })
    }
  }
  return { at, rows }
}

/** Lưu snapshot vào sessionStorage (giới hạn kích thước). */
export function persistAgentSnapshotSession(payload) {
  try {
    const minimal = {
      v: AGENT_CLIENT_VERSION,
      at: payload.at,
      rows: payload.rows,
      lastBackendPushAt: payload.lastBackendPushAt ?? null,
      lastBackendPushOk: payload.lastBackendPushOk ?? null,
    }
    const s = JSON.stringify(minimal)
    if (s.length > 400_000) {
      sessionStorage.setItem(
        AGENT_SNAPSHOT_STORAGE_KEY,
        JSON.stringify({
          ...minimal,
          rows: minimal.rows.map((r) => ({ ...r, summary: (r.summary || '').slice(0, 40) })),
          truncated: true,
        }),
      )
    } else {
      sessionStorage.setItem(AGENT_SNAPSHOT_STORAGE_KEY, s)
    }
  } catch {
    /* quota hoặc private mode */
  }
}

export function loadAgentSnapshotSession() {
  try {
    const raw = sessionStorage.getItem(AGENT_SNAPSHOT_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Gửi snapshot lên backend (JWT). */
export async function postAgentSnapshotToBackend(apiBase, token, at, rows) {
  const base = String(apiBase || '').replace(/\/+$/, '')
  const body = {
    capturedAt: at,
    clientVersion: AGENT_CLIENT_VERSION,
    rows: rows.map((r) => ({
      id: r.id,
      ok: r.ok,
      status: r.status,
      ms: r.ms,
      summary: r.summary,
    })),
  }
  const res = await fetch(`${base}/AgentSync/snapshot`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}
