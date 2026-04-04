import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, PageHeader, SectionCard, StatCard } from '../components/ui'
import { getApiBaseUrl } from '../utils/apiConfig'
import {
  AGENT_CLIENT_VERSION,
  AGENT_SNAPSHOT_STORAGE_KEY,
  AGENT_SYNC_SOURCES,
  loadAgentSnapshotSession,
  persistAgentSnapshotSession,
  postAgentSnapshotToBackend,
  runAgentSyncCycle,
} from '../utils/agentSync'

function getToken() {
  const candidates = [
    localStorage.getItem('auth_token'),
    localStorage.getItem('token'),
    localStorage.getItem('access_token'),
    sessionStorage.getItem('auth_token'),
    sessionStorage.getItem('token'),
    sessionStorage.getItem('access_token'),
  ]
  const first = candidates.find((item) => String(item || '').trim())
  return first ? String(first).replace(/^Bearer\s+/i, '').trim() : ''
}

const LS_AUTO = 'ck_agent_auto'
const LS_INTERVAL = 'ck_agent_interval_sec'
const LS_PUSH = 'ck_agent_push_snapshot'

const GIT_SNIPPET = `# Nhánh FE_BE_DAT, thư mục gốc repo (một terminal riêng):
npm run watch:fe-push
npm run watch:fe-push-lines

# Nên gom thay đổi có ý nghĩa rồi commit tay — tránh hàng trăm commit rỗng.
`

export default function AgentConsolePage() {
  const apiBase = getApiBaseUrl()
  const [auto, setAuto] = useState(() => localStorage.getItem(LS_AUTO) === '1')
  const [pushSnapshot, setPushSnapshot] = useState(() => localStorage.getItem(LS_PUSH) !== '0')
  const [intervalSec, setIntervalSec] = useState(() => {
    const n = parseInt(localStorage.getItem(LS_INTERVAL) || '30', 10)
    return [15, 30, 60, 120].includes(n) ? n : 30
  })
  const [running, setRunning] = useState(false)
  const [lastAt, setLastAt] = useState(null)
  const [rows, setRows] = useState([])
  const [lastBackend, setLastBackend] = useState({ at: null, ok: null })
  const [log, setLog] = useState([])

  const pushLog = useCallback((message, tone = 'neutral') => {
    const t = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLog((prev) => [{ t, message, tone }, ...prev].slice(0, 40))
  }, [])

  useEffect(() => {
    const s = loadAgentSnapshotSession()
    if (s?.rows?.length) {
      setRows(s.rows)
      setLastAt(s.at || null)
      setLastBackend({ at: s.lastBackendPushAt || null, ok: s.lastBackendPushOk ?? null })
    }
  }, [])

  const runOnce = useCallback(async () => {
    const tk = getToken()
    if (!tk) {
      pushLog('Thiếu token — đăng nhập lại.', 'bad')
      return
    }
    setRunning(true)
    try {
      const { at, rows: next } = await runAgentSyncCycle(apiBase, tk, AGENT_SYNC_SOURCES)
      setLastAt(at)
      setRows(next)
      const okCount = next.filter((r) => r.ok).length
      pushLog(`Đồng bộ xong: ${okCount}/${next.length} nguồn OK`, okCount === next.length ? 'ok' : 'warn')

      let backendAt = null
      let backendOk = null
      if (pushSnapshot) {
        const post = await postAgentSnapshotToBackend(apiBase, tk, at, next)
        backendOk = post.ok
        backendAt = new Date().toISOString()
        setLastBackend({ at: backendAt, ok: backendOk })
        if (post.ok) {
          pushLog('Đã POST snapshot → /AgentSync/snapshot', 'ok')
        } else {
          pushLog(`POST snapshot lỗi HTTP ${post.status}`, 'warn')
        }
      } else {
        setLastBackend({ at: null, ok: null })
      }

      persistAgentSnapshotSession({
        at,
        rows: next,
        lastBackendPushAt: backendAt,
        lastBackendPushOk: backendOk,
      })
      pushLog(`Đã lưu snapshot tab (sessionStorage: ${AGENT_SNAPSHOT_STORAGE_KEY})`, 'neutral')
    } catch (e) {
      pushLog(e?.message || 'Lỗi chu kỳ đồng bộ', 'bad')
    } finally {
      setRunning(false)
    }
  }, [apiBase, pushLog, pushSnapshot])

  useEffect(() => {
    localStorage.setItem(LS_AUTO, auto ? '1' : '0')
  }, [auto])

  useEffect(() => {
    localStorage.setItem(LS_PUSH, pushSnapshot ? '1' : '0')
  }, [pushSnapshot])

  useEffect(() => {
    localStorage.setItem(LS_INTERVAL, String(intervalSec))
  }, [intervalSec])

  useEffect(() => {
    if (!auto) return undefined
    const id = setInterval(() => {
      runOnce()
    }, intervalSec * 1000)
    return () => clearInterval(id)
  }, [auto, intervalSec, runOnce])

  useEffect(() => {
    void runOnce()
  }, [runOnce])

  const stats = useMemo(() => {
    const ok = rows.filter((r) => r.ok).length
    return { ok, total: rows.length, fail: rows.length - ok }
  }, [rows])

  const copyGit = () => {
    navigator.clipboard?.writeText(GIT_SNIPPET.trim()).then(
      () => pushLog('Đã copy lệnh git vào clipboard', 'ok'),
      () => pushLog('Không copy được — chọn và copy tay', 'warn'),
    )
  }

  const webhookExample = `curl -X POST "https://localhost:PORT/api/AgentSync/webhook" \\
  -H "Content-Type: application/json" \\
  -H "X-Agent-Webhook-Secret: <AgentSync:WebhookSecret>" \\
  -d "{\\"event\\":\\"external-sync\\",\\"source\\":\\"pos\\"}"`

  return (
    <div className="space-y-6">
      <PageHeader pageKey="agentConsole" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Nguồn OK (lần cuối)" value={rows.length ? `${stats.ok}/${stats.total}` : '—'} tone={stats.fail ? 'amber' : 'green'} />
        <StatCard label="Client version" value={AGENT_CLIENT_VERSION} tone="blue" />
        <StatCard label="Chu kỳ tự động" value={auto ? `${intervalSec}s` : 'Tắt'} tone={auto ? 'blue' : 'stone'} />
        <StatCard
          label="POST snapshot server"
          value={lastBackend.ok == null ? (pushSnapshot ? 'Chờ…' : 'Tắt') : lastBackend.ok ? 'OK' : 'Lỗi'}
          tone={lastBackend.ok === false ? 'amber' : lastBackend.ok ? 'green' : 'neutral'}
        />
      </div>

      <SectionCard
        title="Điều khiển Agent đồng bộ"
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-kitchen-steel">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#c4b8a8] text-primary focus:ring-primary/30"
                checked={pushSnapshot}
                onChange={(e) => setPushSnapshot(e.target.checked)}
              />
              Đẩy snapshot
            </label>
            <button type="button" className="app-button-secondary text-xs sm:text-[13px]" onClick={() => setAuto((v) => !v)}>
              {auto ? 'Tắt tự động' : 'Bật tự động'}
            </button>
            <select
              className="app-input max-w-[140px] py-2 text-xs"
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              disabled={!auto}
            >
              <option value={15}>15 giây</option>
              <option value={30}>30 giây</option>
              <option value={60}>60 giây</option>
              <option value={120}>2 phút</option>
            </select>
            <button type="button" className="app-button-primary text-xs sm:text-[13px]" onClick={() => runOnce()} disabled={running}>
              {running ? 'Đang chạy…' : 'Chạy ngay'}
            </button>
          </div>
        )}
      >
        <p className="mb-4 text-sm leading-relaxed text-kitchen-steel">
          Agent gọi tuần tự các API GET vận hành (dashboard, kho, đơn, danh mục, NCC, giao dịch…). Mỗi lần chạy: cập nhật bảng, ghi{' '}
          <strong>sessionStorage</strong> (<code className="rounded bg-[#efe8da] px-1 text-xs">{AGENT_SNAPSHOT_STORAGE_KEY}</code>
          ), và tùy chọn <strong>POST /AgentSync/snapshot</strong> kèm JWT. Không tự tạo hàng trăm commit git — dùng watcher/npm có chủ đích.
        </p>
        <div className="overflow-x-auto rounded-[1.2rem] border border-[#e7dcd0]">
          <table className="app-table text-left text-sm">
            <thead>
              <tr>
                <th className="app-th">Nguồn</th>
                <th className="app-th">Trạng thái</th>
                <th className="app-th">HTTP</th>
                <th className="app-th">ms</th>
                <th className="app-th">Tóm tắt phản hồi</th>
              </tr>
            </thead>
            <tbody>
              {AGENT_SYNC_SOURCES.map((src) => {
                const r = rows.find((x) => x.id === src.id)
                return (
                  <tr key={src.id}>
                    <td className="app-td font-medium text-kitchen-ink">{src.label}</td>
                    <td className="app-td">
                      {r ? (
                        <Badge tone={r.ok ? 'green' : 'red'}>{r.ok ? 'OK' : 'Lỗi'}</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="app-td font-mono text-xs">{r?.status ?? '—'}</td>
                    <td className="app-td font-mono text-xs">{r?.ms ?? '—'}</td>
                    <td className="app-td text-kitchen-steel">{r?.summary ?? 'Chưa chạy'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Webhook ngoài → backend">
        <p className="mb-3 text-sm text-kitchen-steel">
          Cấu hình <code className="rounded bg-[#efe8da] px-1">AgentSync:WebhookSecret</code> trong{' '}
          <code className="rounded bg-[#efe8da] px-1">appsettings.json</code> (không để rỗng nếu muốn bật). Mọi request phải gửi header{' '}
          <code className="rounded bg-[#efe8da] px-1">X-Agent-Webhook-Secret</code> trùng secret. Nếu secret rỗng, API trả 503.
        </p>
        <pre className="overflow-x-auto rounded-[1rem] border border-[#dfd4c4] bg-[#1f2922] p-4 font-mono text-[11px] leading-relaxed text-[#e8dfd0] sm:text-xs">
          {webhookExample}
        </pre>
      </SectionCard>

      <SectionCard title="Nhật ký Agent (client)">
        {log.length === 0 ? (
          <p className="text-sm text-kitchen-steel">Chưa có sự kiện. Bấm &quot;Chạy ngay&quot; hoặc bật tự động.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {log.map((item, i) => (
              <li
                key={`${item.t}-${i}`}
                className={`flex gap-3 rounded-xl border px-3 py-2 ${
                  item.tone === 'ok'
                    ? 'border-[#c6dbc7] bg-[#f4faf4]'
                    : item.tone === 'bad'
                      ? 'border-[#efc5bd] bg-[#fff5f2]'
                      : item.tone === 'warn'
                        ? 'border-[#ead7b4] bg-[#fffbf0]'
                        : 'border-[#e7dcd0] bg-[#fffbf6]'
                }`}
              >
                <span className="shrink-0 font-mono text-xs text-kitchen-steel">{item.t}</span>
                <span className="text-kitchen-ink">{item.message}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Git: commit & push (máy dev)"
        action={(
          <button type="button" className="app-button-secondary text-xs" onClick={copyGit}>
            Copy lệnh
          </button>
        )}
      >
        <p className="mb-3 text-sm text-kitchen-steel">
          Trình duyệt không thể chạy <code className="rounded bg-[#efe8da] px-1">git</code> an toàn. Chạy watcher trong terminal tại
          <strong> thư mục gốc repo</strong>, nhánh <strong>FE_BE_DAT</strong>:
        </p>
        <pre className="overflow-x-auto rounded-[1rem] border border-[#dfd4c4] bg-[#1f2922] p-4 font-mono text-xs text-[#e8dfd0]">{GIT_SNIPPET.trim()}</pre>
      </SectionCard>
    </div>
  )
}
