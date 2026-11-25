const KEY = 'sitePassword'

export function getSitePassword(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function setSitePassword(pw: string) {
  try {
    localStorage.setItem(KEY, pw)
  } catch {
    // storage blocked, ignore
  }
}

export function clearSitePassword() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // storage blocked, ignore
  }
}

// true = right, false = wrong, throws if the server can't be reached.
export async function checkPassword(pw: string): Promise<boolean> {
  const res = await fetch('/api/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  })
  if (res.status === 200) return true
  if (res.status === 401) return false
  throw new Error(`Unlock failed (${res.status})`)
}
