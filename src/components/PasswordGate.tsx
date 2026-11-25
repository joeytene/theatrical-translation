import { useEffect, useState, type ReactNode } from 'react'
import { checkPassword, clearSitePassword, getSitePassword, setSitePassword } from '../lib/auth'

const page = {
  position: 'fixed',
  inset: 0,
  background: '#000',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
} as const

type State = 'checking' | 'locked' | 'open'

// Removes ?k= from the URL, keeping other params. Safe to call twice.
function stripUrlKey() {
  const url = new URL(location.href)
  if (!url.searchParams.has('k')) return
  url.searchParams.delete('k')
  history.replaceState(history.state, '', url.pathname + url.search + url.hash)
}

export default function PasswordGate({ children }: { children: ReactNode }) {
  // Read once without side effects: StrictMode runs the effect twice, and the
  // second run must still see the key after the first strips it from the URL.
  const [urlKey] = useState(() => new URLSearchParams(location.search).get('k'))
  const hasUrlKey = urlKey !== null
  const [state, setState] = useState<State>(() =>
    hasUrlKey ? 'checking' : getSitePassword() ? 'open' : 'locked',
  )
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    if (urlKey !== null) {
      const k = urlKey
      stripUrlKey()
      checkPassword(k)
        .then((ok) => {
          if (ok) setSitePassword(k)
          setState(ok ? 'open' : 'locked')
        })
        .catch(() => setState('locked'))
      return
    }
    // /watch never calls the API, so re-check a stored password in the background.
    const stored = getSitePassword()
    if (stored) {
      checkPassword(stored)
        .then((ok) => {
          if (!ok) {
            clearSitePassword()
            setState('locked')
          }
        })
        .catch(() => {}) // ignore network errors
    }
  }, [urlKey])

  async function submit() {
    if (busy || !value) return
    setBusy(true)
    setOffline(false)
    try {
      if (await checkPassword(value)) {
        setSitePassword(value)
        setState('open')
        return
      }
      setWrong(true)
      setValue('')
      setTimeout(() => setWrong(false), 600)
    } catch {
      setOffline(true)
    } finally {
      setBusy(false)
    }
  }

  if (state === 'open') return <>{children}</>
  if (state === 'checking') return <div style={page} />

  return (
    <div style={page}>
      <style>{'@keyframes gate-shake{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}'}</style>
      <input
        type="password"
        placeholder="password"
        autoFocus
        autoComplete="current-password"
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{
          background: '#000',
          color: '#bbb',
          border: `1px solid ${wrong ? '#c33' : '#222'}`,
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 16,
          width: 180,
          textAlign: 'center',
          outline: 'none',
          animation: wrong ? 'gate-shake 0.3s' : undefined,
        }}
      />
      {offline && <p style={{ color: '#555', fontSize: 12, margin: '10px 0 0' }}>Can&apos;t reach server</p>}
    </div>
  )
}
