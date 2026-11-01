const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1').replace(/\/+$/, '')

export async function apiRequest(path, accessToken, options = {}) {
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  let response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new Error(`Could not reach the SpendWise API at ${apiBaseUrl}. Check that the backend is running and reachable.`)
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error?.message || `The API request failed with status ${response.status}.`)
  }
  if (response.status === 204) return null
  const payload = await response.json()
  return payload.data
}
