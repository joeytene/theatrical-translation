import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import JoinCode from '../components/JoinCode'
import ThemeSettings from '../components/ThemeSettings'
import TopBar from '../components/TopBar'
import { useBroadcastPublisher } from '../hooks/useBroadcast'
import { useWakeLock } from '../hooks/useWakeLock'
import { useTranslationSession, type SessionStatus } from '../hooks/useTranslationSession'
import { getTransmitCode, newTransmitCode } from '../lib/joinCode'
import { supabaseConfigError } from '../lib/supabase'

function statusLabel(status: SessionStatus, countdown: number | null, attempt: number) {
  switch (status) {
    case 'idle': return 'Ready'
    case 'requesting-mic': return 'Getting microphone…'
    case 'connecting': return 'Connecting…'
    case 'connected': return 'Connected'
    case 'countdown': return `Starting in ${countdown ?? ''}…`
    case 'live': return '● Listening'
    case 'reconnecting': return attempt > 0 ? `Reconnecting… (attempt ${attempt})` : 'Reconnecting…'
    case 'error': return 'Error'
  }
}

export default function Transmit() {
  const [code, setCode] = useState(() => getTransmitCode())
  const { push, clear, status: broadcastStatus } = useBroadcastPublisher(code)
  const [preview, setPreview] = useState('')
  const [showTheme, setShowTheme] = useState(false)

  const handleDelta = useCallback(
    (delta: string) => {
      setPreview((p) => (p + delta).slice(-1000))
      push(delta)
    },
    [push],
  )

  const session = useTranslationSession(handleDelta)

  const running = session.status !== 'idle' && session.status !== 'error'
  useWakeLock(running)

  const watchUrl = `${location.origin}/watch?code=${code}`
  const projectorUrl = `/watch?code=${code}&projector`

  function clearCaptions() {
    clear()
    setPreview('')
  }

  function newCode() {
    clear() // still targets the old room
    setPreview('')
    setCode(newTransmitCode())
  }

  return (
    <main>
      <TopBar onClick={() => setShowTheme(true)} />
      <h1>Transmit</h1>
      <div className="join-row">
        <JoinCode code={code} />
        <div className="qr-block">
          <div className="qr-tile">
            <QRCodeSVG value={watchUrl} size={220} marginSize={2} />
          </div>
          <div>Scan to get captions</div>
          <p className="muted">{watchUrl}</p>
          <a className="projector-link" href={projectorUrl} target="_blank" rel="noreferrer">Projector link</a>
        </div>
      </div>

      <div className="btn-row">
        <button onClick={session.start} disabled={running}>Start (live mic)</button>
        <button onClick={session.stop} disabled={!running}>Stop</button>
        <button onClick={clearCaptions}>Clear</button>
        <button onClick={newCode} disabled={running}>New code</button>
      </div>

      {session.status === 'countdown' && session.countdown !== null && (
        <div className="countdown">{session.countdown}</div>
      )}
      {session.status !== 'idle' && (
        <div className="meter">
          <div className="meter-fill" style={{ width: `${session.level * 100}%` }} />
        </div>
      )}

      <p className="status">
        Status: {statusLabel(session.status, session.countdown, session.attempt)} · Audience link: {broadcastStatus}
      </p>
      {session.error && <p className="err">{session.error}</p>}
      {supabaseConfigError && <p className="err">{supabaseConfigError}</p>}

      <div className="caption-box">{preview}</div>
      <Link className="btn" to="/">Home</Link>
      {showTheme && <ThemeSettings onDone={() => setShowTheme(false)} />}
    </main>
  )
}
