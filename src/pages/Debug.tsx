import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchClientSecret } from '../lib/api'

// Test page: checks that the server can hand out a token.
export default function Debug() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function getToken() {
    setStatus('loading')
    try {
      const { value, expires_at } = await fetchClientSecret()
      // Only show the first few characters, never the whole secret.
      const when = expires_at ? new Date(expires_at * 1000).toLocaleString() : 'unknown'
      setMessage(`Token: ${value.slice(0, 8)}…  Expires: ${when}`)
      setStatus('ok')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  return (
    <main>
      <h1>Debug</h1>
      <button onClick={getToken} disabled={status === 'loading'}>
        Get token
      </button>
      {status === 'loading' && <p>Loading…</p>}
      {status === 'ok' && <p className="ok">{message}</p>}
      {status === 'error' && <p className="err">{message}</p>}
      <Link className="btn" to="/">Home</Link>
    </main>
  )
}
