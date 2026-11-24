import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import JoinCode from '../components/JoinCode'
import { useBroadcastPublisher } from '../hooks/useBroadcast'
import { useWakeLock } from '../hooks/useWakeLock'
import { useTranslationSession } from '../hooks/useTranslationSession'
import { startFakeStream } from '../lib/fakeTranslation'
import { getTransmitCode, newTransmitCode } from '../lib/joinCode'
import { supabaseConfigError } from '../lib/supabase'

export default function Transmit() {
  const [code, setCode] = useState(() => getTransmitCode())
  const { push, status: broadcastStatus } = useBroadcastPublisher(code)
  const [preview, setPreview] = useState('')
  // Holds the stop function while Simulate is running.
  const [stopFake, setStopFake] = useState<(() => void) | null>(null)

  // Both the real session and Simulate send text through here.
  const handleDelta = useCallback(
    (delta: string) => {
      setPreview((p) => (p + delta).slice(-1000))
      push(delta)
    },
    [push],
  )

  const session = useTranslationSession(handleDelta)

  // Stop Simulate if we leave the page.
  useEffect(() => () => stopFake?.(), [stopFake])
  const liveRunning = session.status !== 'idle' && session.status !== 'error'
  const running = liveRunning || stopFake !== null
  useWakeLock(running)

  function stopAll() {
    session.stop()
    stopFake?.()
    setStopFake(null)
  }

  return (
    <main>
      <h1>Transmit</h1>
      <JoinCode code={code} />
      <p>{`${location.origin}/watch?code=${code}`}</p>

      <div className="btn-row">
        <button onClick={session.start} disabled={running}>Start (live mic)</button>
        <button onClick={() => setStopFake(() => startFakeStream(handleDelta))} disabled={running}>
          Simulate
        </button>
        <button onClick={stopAll} disabled={!running}>Stop</button>
        <button onClick={() => setCode(newTransmitCode())} disabled={running}>New code</button>
      </div>

      <p className="status">
        OpenAI: {stopFake ? 'simulating' : session.status} · Broadcast: {broadcastStatus}
      </p>
      {session.error && <p className="err">{session.error}</p>}
      {supabaseConfigError && <p className="err">{supabaseConfigError}</p>}

      <div className="caption-box">{preview}</div>
      <Link className="btn" to="/">Home</Link>
    </main>
  )
}
