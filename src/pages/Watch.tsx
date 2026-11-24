import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useBroadcastSubscriber } from '../hooks/useBroadcast'
import { useWakeLock } from '../hooks/useWakeLock'
import ViewerSettingsPanel from '../components/ViewerSettingsPanel'
import { normalizeCode } from '../lib/joinCode'
import {
  hasSeenSetup,
  loadSettings,
  markSetupSeen,
  saveSettings,
  type ViewerSettings,
} from '../lib/viewerSettings'
import { supabaseConfigError } from '../lib/supabase'

export default function Watch() {
  const [params, setParams] = useSearchParams()
  const code = normalizeCode(params.get('code') ?? '') || null
  const [input, setInput] = useState('')
  const { text, lastMessageAt, status } = useBroadcastSubscriber(code)
  useWakeLock(code !== null)

  // Display settings, saved on this device. The panel opens on first join.
  const [settings, setSettings] = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(() => !hasSeenSetup())

  function updateSettings(s: ViewerSettings) {
    setSettings(s)
    saveSettings(s)
  }

  function closeSettings() {
    markSetupSeen()
    setShowSettings(false)
  }

  // Stick to the newest text unless the viewer scrolled up.
  const boxRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(true)
  useEffect(() => {
    const el = boxRef.current
    if (el && stuck) el.scrollTop = el.scrollHeight
  }, [text, stuck, settings.fontSize])

  function onScroll() {
    const el = boxRef.current
    if (!el) return
    setStuck(el.scrollHeight - el.scrollTop - el.clientHeight <= 40)
  }

  function jumpToLive() {
    const el = boxRef.current
    if (el) el.scrollTop = el.scrollHeight
    setStuck(true)
  }

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
    <div
      className={`watch-screen pos-${settings.position}`}
      style={{ background: settings.bgColor, color: settings.textColor }}
    >
      <div className="watch-chrome">
        <span>
          Code {code} · {status === 'connected' ? 'connected' : status === 'off' ? 'not configured' : 'Reconnecting…'}
        </span>
        <button className="chrome-btn" onClick={() => setShowSettings(true)} aria-label="Caption settings">
          ⚙
        </button>
        <Link className="chrome-btn" to="/watch">Change code</Link>
      </div>
      {supabaseConfigError && <p className="err watch-err">{supabaseConfigError}</p>}

      {/* Height is about 4 lines of text at the chosen size. */}
      <div
        className="watch-captions"
        ref={boxRef}
        onScroll={onScroll}
        style={{ fontSize: settings.fontSize, height: `${settings.fontSize * 1.4 * 4}px` }}
      >
        {text || (status === 'connected' && lastMessageAt === null ? 'Waiting for transmitter…' : '')}
      </div>

      {!stuck && (
        <button className="jump-live" onClick={jumpToLive}>Jump to live ↓</button>
      )}

      {showSettings && (
        <ViewerSettingsPanel settings={settings} onChange={updateSettings} onDone={closeSettings} />
      )}
    </div>
  )
}
