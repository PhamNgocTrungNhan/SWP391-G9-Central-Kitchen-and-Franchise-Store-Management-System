const DEFAULT_BASE = 'https://69d0627190cd06523d5d33ca.mockapi.io'

export function getMockApiBaseUrl() {
  const raw = import.meta.env.VITE_MOCKAPI_BASE_URL
  return String(raw || DEFAULT_BASE).replace(/\/+$/, '')
}

/**
 * @param {string} endpoint - ví dụ: "products" hoặc "products/1"
 * @param {RequestInit} [init]
 */
export function mockApiUrl(endpoint) {
  const base = getMockApiBaseUrl()
  const path = String(endpoint || '').replace(/^\/+/, '')
  return path ? `${base}/${path}` : base
}

/**
 * @param {string} endpoint
 * @param {RequestInit} [init]
 */
export async function fetchMockApi(endpoint, init = {}) {
  const url = mockApiUrl(endpoint)
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await response.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!response.ok) {
    const err = new Error(typeof body === 'string' ? body : response.statusText || 'Request failed')
    err.status = response.status
    err.body = body
    throw err
  }
  return body
}
