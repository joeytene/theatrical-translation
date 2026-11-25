import { clearSitePassword, getSitePassword } from './auth'

// Asks our server for a short-lived OpenAI token.
export async function fetchClientSecret(): Promise<{
  value: string
  expires_at: number | null
}> {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'x-site-password': getSitePassword() },
  })
  if (res.status === 401) {
    // Stored password is bad: show the gate again.
    clearSitePassword()
    location.reload()
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    let msg = data.error ?? `Request failed (${res.status})`
    if (data.detail) {
      msg += ': ' + (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
    }
    throw new Error(msg)
  }
  return data
}
