import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useBroadcastSubscriber } from '../hooks/useBroadcast'
import { normalizeCode } from '../lib/joinCode'
import { supabaseConfigError } from '../lib/supabase'

export default function Watch() {
  const [params, setParams] = useSearchParams()
  const code = normalizeCode(params.get('code') ?? '') || null
  const [input, setInput] = useState('')
  const { text, status } = useBroadcastSubscriber(code)

  // Keep the newest text in view.
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = boxRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text])

  if (!code) {
    return (
      <main>
        <h1>Watch</h1>
        <form
          className="btn-row"
          onSubmit={(e) => {
            e.preventDefault()
            const c = normalizeCode(input)
            if (c) setParams({ code: c })
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={4}
            autoCapitalize="characters"
            placeholder="CODE"
          />
          <button type="submit">Join</button>
        </form>
        <Link className="btn" to="/">Home</Link>
      </main>
    )
  }

  return (
    <main>
      <p className="status">Code {code} · {status}</p>
      {supabaseConfigError && <p className="err">{supabaseConfigError}</p>}
      <div className="caption-box" ref={boxRef}>
        {text || 'Waiting for transmitter…'}
      </div>
      <Link className="btn" to="/watch">Change code</Link>
    </main>
  )
}
