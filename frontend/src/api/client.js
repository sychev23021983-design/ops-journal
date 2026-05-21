const BASE = '/api'

function getToken() {
  return localStorage.getItem('ops_token')
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('ops_token')
    window.location.href = '/login'
    return
  }

  if (res.status === 204) return null
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Ошибка запроса')
  }
  return res.json()
}

export const api = {
  login: (password) => req('POST', '/auth/login', { password }),

  incidents: {
    list:   (params = {}) => req('GET', '/incidents?' + new URLSearchParams(params)),
    get:    (id)          => req('GET', `/incidents/${id}`),
    create: (data)        => req('POST', '/incidents', data),
    update: (id, data)    => req('PUT', `/incidents/${id}`, data),
    delete: (id)          => req('DELETE', `/incidents/${id}`),
  },

  stats:  (params = {}) => req('GET', '/stats?' + new URLSearchParams(params)),
  months: ()            => req('GET', '/months'),
}
