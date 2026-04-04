/**
 * Base URL cho REST API.
 * - Dev mặc định: `/api` → Vite (dev/preview) proxy tới Shop2026.
 * - Có thể set `VITE_API_BASE_URL` (vd. http://localhost:5202); khi đó backend cần CORS (Shop2026 bật ở Development).
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return '/api'
  }
  const trimmed = String(raw).trim().replace(/\/+$/, '')
  return trimmed || '/api'
}
