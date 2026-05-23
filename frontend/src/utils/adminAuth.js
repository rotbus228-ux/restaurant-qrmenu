export function getToken() {
  return localStorage.getItem('admin_token')
}

export function getAuthHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function isAdminLoggedIn() {
  const token = getToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.isAdmin === true && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function adminLogout() {
  localStorage.removeItem('admin_token')
}

export function handleAuthError(err, navigate) {
  if (err?.response?.status === 401 || err?.response?.status === 403) {
    adminLogout()
    navigate('/', { replace: true })
    return true
  }
  return false
}
