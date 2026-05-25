const BASE = '/api'

export function getToken()  { return localStorage.getItem('ops_token') }
export function getRole()   { return localStorage.getItem('ops_role') || 'viewer' }
export function isAdmin()   { return getRole() === 'admin' }

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
    localStorage.removeItem('ops_role')
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
  me:    ()         => req('GET',  '/auth/me'),

  incidents: {
    list:        (params = {}) => req('GET',    '/incidents?' + new URLSearchParams(params)),
    get:         (id)           => req('GET',    `/incidents/${id}`),
    create:      (data)         => req('POST',   '/incidents', data),
    update:      (id, data)     => req('PUT',    `/incidents/${id}`, data),
    patchStatus: (id, status)   => req('PATCH',  `/incidents/${id}/status`, { status }),
    delete:      (id)           => req('DELETE', `/incidents/${id}`),
  },

  employees: {
    list:   (includeInactive = false) => req('GET',    `/employees?include_inactive=${includeInactive}`),
    create: (data)                    => req('POST',   '/employees', data),
    update: (id, data)                => req('PUT',    `/employees/${id}`, data),
    delete: (id)                      => req('DELETE', `/employees/${id}`),
  },

  stats:  (params = {}) => req('GET', '/stats?' + new URLSearchParams(params)),
  months: ()            => req('GET', '/months'),

  settings: {
    get:            ()       => req('GET', '/settings'),
    update:         (data)   => req('PUT', '/settings', data),
    publicSettings: ()       => fetch('/api/settings/public').then(r => r.json()),
    uploadLogo:     (file)   => uploadFile('/settings/upload/logo', file),
    uploadFavicon:  (file)   => uploadFile('/settings/upload/favicon', file),
  },

  plan: {
    upload:    (file)  => uploadFile('/plan/upload', file),
    imageUrl:  ()      => BASE + '/plan/image',
    delete:    ()      => req('DELETE', '/plan/image'),
    exists:    ()      => fetch(BASE + '/plan/image', {
                            method: 'HEAD',
                            headers: getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {},
                          }).then(r => r.ok).catch(() => false),
  },

  backup: {
    exportUrl: () => BASE + '/backup/export',
    import:    (file) => uploadFile('/backup/import', file),
  },
}

async function uploadFile(path, file) {
  const formData = new FormData()
  formData.append('file', file)
  const token = getToken()
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Ошибка загрузки')
  }
  return res.json()
}
