const ROLE_CLAIM_KEYS = [
  'role',
  'roles',
  'Role',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
]

const ROLE_ALIASES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  KITCHEN_STAFF: 'KITCHEN_STAFF',
  KITCHENSTAFF: 'KITCHEN_STAFF',
  KITCHEN: 'KITCHEN_STAFF',
  CK_STAFF: 'KITCHEN_STAFF',
  STORE_STAFF: 'STORE_STAFF',
  STORESTAFF: 'STORE_STAFF',
  STORE: 'STORE_STAFF',
  SUPPLY_COORDINATOR: 'SUPPLY_COORDINATOR',
  SUPPLYCOORDINATOR: 'SUPPLY_COORDINATOR',
  COORDINATOR: 'SUPPLY_COORDINATOR',
}

function normalizeRole(role) {
  const raw = String(role || '').trim()
  if (!raw) return ''

  const normalized = raw
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase()

  return ROLE_ALIASES[normalized] || normalized
}

function getStoredCandidates() {
  return [
    localStorage.getItem('auth_token'),
    localStorage.getItem('token'),
    localStorage.getItem('access_token'),
    sessionStorage.getItem('auth_token'),
    sessionStorage.getItem('token'),
    sessionStorage.getItem('access_token'),
  ]
}

export function getStoredToken() {
  const firstToken = getStoredCandidates().find((item) => String(item || '').trim())
  if (!firstToken) return ''
  return String(firstToken).replace(/^Bearer\s+/i, '').trim()
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)

  const ascii = atob(padded)
  const bytes = Uint8Array.from(ascii, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeJwtPayload(token) {
  const normalized = String(token || '').replace(/^Bearer\s+/i, '').trim()
  if (!normalized) return null

  const parts = normalized.split('.')
  if (parts.length < 2) return null

  try {
    return JSON.parse(decodeBase64Url(parts[1]))
  } catch {
    return null
  }
}

function extractRoleFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return ''

  for (const key of ROLE_CLAIM_KEYS) {
    const value = payload[key]
    if (Array.isArray(value)) {
      const role = value.find((item) => normalizeRole(item))
      if (role) return normalizeRole(role)
    }

    const role = normalizeRole(value)
    if (role) return role
  }

  const fallbackKey = Object.keys(payload).find((key) => key.toLowerCase().includes('role'))
  if (!fallbackKey) return ''

  const fallbackValue = payload[fallbackKey]
  if (Array.isArray(fallbackValue)) {
    const role = fallbackValue.find((item) => normalizeRole(item))
    return normalizeRole(role)
  }

  return normalizeRole(fallbackValue)
}

export function saveUserRole(role) {
  const normalized = normalizeRole(role)
  if (!normalized) return ''
  localStorage.setItem('user_role', normalized)
  return normalized
}

export function getCurrentUserRole() {
  const storedRole = normalizeRole(localStorage.getItem('user_role'))
  if (storedRole) return storedRole

  const payload = decodeJwtPayload(getStoredToken())
  const tokenRole = extractRoleFromPayload(payload)
  if (tokenRole) {
    localStorage.setItem('user_role', tokenRole)
  }

  return tokenRole
}

export function clearAuthStorage() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('token')
  localStorage.removeItem('access_token')
  localStorage.removeItem('user_role')
  localStorage.removeItem('storeId')
  localStorage.removeItem('store_id')
  localStorage.removeItem('userId')
  sessionStorage.removeItem('auth_token')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('access_token')
}

export function getStoreIdFromToken() {
  const payload = decodeJwtPayload(getStoredToken())
  return payload?.StoreId || null
}
