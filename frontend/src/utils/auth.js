const TOKEN_KEY = 'naninha_token'
const ROLE_KEY = 'naninha_role'
const NAME_KEY = 'naninha_name'

export function saveAuth(token, role, name) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ROLE_KEY, role)
  localStorage.setItem(NAME_KEY, name || '')
}

export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function getRole() { return localStorage.getItem(ROLE_KEY) }
export function getName() { return localStorage.getItem(NAME_KEY) }

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(NAME_KEY)
}

export async function apiFetch(path, options = {}) {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro na requisicao')
  return data
}
