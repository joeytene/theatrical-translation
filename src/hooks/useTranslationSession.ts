import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchClientSecret } from '../lib/api'

export type SessionStatus =
  | 'idle'
  | 'requesting-mic'
  | 'connecting'
  | 'connected'
  | 'countdown'
  | 'live'
  | 'reconnecting'
  | 'error'

export function useTranslationSession(onDelta: (d: string) => void) {
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [level, setLevel] = useState(0)
  const [attempt, setAttempt] = useState(0)

  // Keep the latest callback without restarting the session.
  const onDeltaRef = useRef(onDelta)
  onDeltaRef.current = onDelta

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startingRef = useRef(false)
  const timersRef = useRef<number[]>([]) // countdown timers
  const rafRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const meterStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  // Bumped on every cleanup so an in-progress start() knows it was cancelled.
  const runRef = useRef(0)
  // Bumped for every new or torn-down connection so old handlers are ignored.
  const connIdRef = useRef(0)
  const wantRunningRef = useRef(false)
  const wentLiveRef = useRef(false) // the countdown only happens before the first live
  const attemptRef = useRef(0)
  const backoffTimerRef = useRef<number | null>(null)
  const disconnectTimerRef = useRef<number | null>(null)
  const connectRef = useRef<() => void>(() => {})

  // Close only the peer connection and data channel. The mic and meter stay.
  const teardownConn = useCallback(() => {
    connIdRef.current++
    if (disconnectTimerRef.current !== null) clearTimeout(disconnectTimerRef.current)
    disconnectTimerRef.current = null
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    dcRef.current?.close()
    pcRef.current?.close()
    dcRef.current = null
    pcRef.current = null
    setCountdown(null)
  }, [])

  // Release the mic and close the connection.
  const cleanup = useCallback(() => {
    wantRunningRef.current = false
    wentLiveRef.current = false
    attemptRef.current = 0
    if (backoffTimerRef.current !== null) clearTimeout(backoffTimerRef.current)
    backoffTimerRef.current = null
    teardownConn()
    cancelAnimationFrame(rafRef.current)
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    meterStreamRef.current?.getTracks().forEach((t) => t.stop())
    meterStreamRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    startingRef.current = false
    runRef.current++
    setAttempt(0)
    setLevel(0)
  }, [teardownConn])

  const stop = useCallback(() => {
    cleanup()
    setStatus('idle')
  }, [cleanup])

  const fail = useCallback(
    (message: string) => {
      cleanup()
      setError(message)
      setStatus('error')
    },
    [cleanup],
  )

  // Try again after 1 s, 2 s, 4 s, 8 s, then every 10 s.
  const scheduleRetry = useCallback(() => {
    if (backoffTimerRef.current !== null) return // already waiting
    const delay = [1000, 2000, 4000, 8000][attemptRef.current] ?? 10000
    attemptRef.current++
    setAttempt(attemptRef.current)
    backoffTimerRef.current = window.setTimeout(() => {
      backoffTimerRef.current = null
      connectRef.current()
    }, delay)
  }, [])

  // The mic track can end when iPad Safari locks the screen. Treat that as a drop.
  const watchMic = useCallback(
    (stream: MediaStream) => {
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (!wantRunningRef.current || streamRef.current !== stream) return
          teardownConn()
          setError('Connection lost: Microphone stopped')
          setStatus('reconnecting')
          scheduleRetry()
        }
      })
    },
    [teardownConn, scheduleRetry],
  )

  // One connection attempt. Runs many times per Start.
  const connect = useCallback(async () => {
    if (!wantRunningRef.current) return
    const runId = runRef.current
    const id = ++connIdRef.current
    const stale = () => runRef.current !== runId || connIdRef.current !== id

    // Every drop signal comes through here. Only the first one per connection counts.
    const drop = (cause: unknown) => {
      if (stale()) return
      console.error(cause)
      teardownConn()
      if (!wantRunningRef.current) return
      // Show the cause so a permanent problem (bad key, quota) is visible on the iPad.
      const why = cause instanceof Error ? cause.message : String(cause)
      setError(`Connection lost: ${why.slice(0, 300)}`)
      setStatus('reconnecting')
      scheduleRetry()
    }

    if (attemptRef.current === 0) setStatus('connecting')
    try {
      // a2. Get a fresh mic if the old one is gone or ended.
      let mic = streamRef.current
      if (!mic || mic.getAudioTracks().some((t) => t.readyState === 'ended')) {
        const fresh = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (stale()) {
          fresh.getTracks().forEach((t) => t.stop())
          return
        }
        mic?.getTracks().forEach((t) => t.stop())
        meterStreamRef.current?.getTracks().forEach((t) => t.stop())
        meterStreamRef.current = null
        // Live already means the mic is open. Otherwise stay silent until the countdown ends.
        fresh.getAudioTracks().forEach((t) => (t.enabled = wentLiveRef.current))
        streamRef.current = fresh
        watchMic(fresh)
        try {
          const ctx = audioCtxRef.current
          const analyser = analyserRef.current
          if (ctx && analyser) {
            const meterStream = new MediaStream([fresh.getAudioTracks()[0].clone()])
            meterStreamRef.current = meterStream
            ctx.createMediaStreamSource(meterStream).connect(analyser)
          }
        } catch (e) {
          console.error(e) // the meter is optional
        }
        audioCtxRef.current?.resume().catch(() => {})
        mic = fresh
      }
      const stream = mic

      // b. Short-lived token from our server
      const { value } = await fetchClientSecret()
      if (stale()) return

      // c. Peer connection with the mic track
      const pc = new RTCPeerConnection()
      pcRef.current = pc
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream))

      // d. Deliberately ignore the remote English audio: playing it would echo into the mic.
      pc.ontrack = () => {}

      pc.onconnectionstatechange = () => {
        if (stale()) return
        const state = pc.connectionState
        if (state === 'failed') {
          drop('Peer connection failed')
        } else if (state === 'disconnected') {
          // It often recovers on its own, so wait 5 s before giving up.
          if (disconnectTimerRef.current === null) {
            disconnectTimerRef.current = window.setTimeout(() => {
              disconnectTimerRef.current = null
              drop('Peer connection disconnected for over 5 s')
            }, 5000)
          }
        } else if (state === 'connected' && disconnectTimerRef.current !== null) {
          clearTimeout(disconnectTimerRef.current)
          disconnectTimerRef.current = null
        }
      }

      // e. Data channel carries the text events
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.onopen = () => {
        if (stale()) return
        attemptRef.current = 0
        setAttempt(0)
        setError(null)
        if (wentLiveRef.current) {
          // Reconnect: no countdown, the mic stays on.
          setStatus('live')
          return
        }
        setStatus('connected')
        // Short pause, then count 3, 2, 1 before going live.
        const later = (fn: () => void, ms: number) => {
          timersRef.current.push(window.setTimeout(() => !stale() && fn(), ms))
        }
        const show = (n: number) => {
          setStatus('countdown')
          setCountdown(n)
        }
        later(() => show(3), 800)
        later(() => show(2), 1800)
        later(() => show(1), 2800)
        later(() => {
          stream.getAudioTracks().forEach((t) => (t.enabled = true))
          wentLiveRef.current = true
          setCountdown(null)
          setStatus('live')
        }, 3800)
      }
      dc.onclose = () => drop('Data channel closed')
      dc.onmessage = (msg) => {
        if (stale()) return
        let event: { type?: string; delta?: string; error?: { message?: string } }
        try {
          event = JSON.parse(msg.data)
        } catch {
          return
        }
        if (event.type === 'session.output_transcript.delta') {
          // Pass through exactly as-is: no trimming, no added spaces.
          onDeltaRef.current(event.delta ?? '')
        } else if (event.type === 'error') {
          drop(event.error?.message ?? JSON.stringify(event))
        } else if (event.type === 'session.closed') {
          drop('session.closed')
        }
      }

      // f. Offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // g. Send the offer to OpenAI, get the answer
      const res = await fetch('https://api.openai.com/v1/realtime/translations/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${value}`,
          'Content-Type': 'application/sdp',
        },
      })
      if (!res.ok) throw new Error(await res.text())

      // h. Finish the handshake. Status moves on when the data channel opens.
      await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() })
    } catch (e) {
      drop(e) // ignored if Stop was pressed
    }
  }, [teardownConn, scheduleRetry, watchMic])
  connectRef.current = connect

  const start = useCallback(async () => {
    if (startingRef.current) return // already running
    startingRef.current = true
    wantRunningRef.current = true
    wentLiveRef.current = false
    attemptRef.current = 0
    const runId = runRef.current
    const cancelled = () => runRef.current !== runId
    setError(null)
    setAttempt(0)

    // Create the meter's AudioContext now, while we are still inside the tap.
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      audioCtxRef.current = ctx
      ctx.resume().catch(() => {})
    } catch (e) {
      console.error(e) // the meter is optional
    }

    // a. Microphone (must be triggered by a tap on iPad Safari). A failure here is fatal.
    setStatus('requesting-mic')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      if (cancelled()) return // Stop was pressed while asking for the mic
      fail('Microphone access denied. Allow the microphone in your browser settings and try again.')
      return
    }
    if (cancelled()) {
      stream.getTracks().forEach((t) => t.stop()) // Stop was pressed while asking for the mic
      return
    }
    streamRef.current = stream
    watchMic(stream)
    // Silent until the countdown ends.
    stream.getAudioTracks().forEach((t) => (t.enabled = false))

    // Level meter reads a clone of the track, because a disabled track is silent.
    try {
      const ctx = audioCtxRef.current
      if (!ctx) throw new Error('No AudioContext')
      const meterStream = new MediaStream([stream.getAudioTracks()[0].clone()])
      meterStreamRef.current = meterStream
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyserRef.current = analyser
      ctx.createMediaStreamSource(meterStream).connect(analyser)
      const buf = new Float32Array(analyser.fftSize)
      let last = 0
      const tick = (now: number) => {
        rafRef.current = requestAnimationFrame(tick)
        if (now - last < 66) return
        last = now
        analyser.getFloatTimeDomainData(buf)
        let sum = 0
        for (const v of buf) sum += v * v
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4))
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (e) {
      console.error(e) // the meter is optional
    }

    connect()
  }, [fail, connect, watchMic])

  // When the network comes back, retry right away instead of waiting out the backoff.
  useEffect(() => {
    const onOnline = () => {
      if (!wantRunningRef.current || backoffTimerRef.current === null) return
      clearTimeout(backoffTimerRef.current)
      backoffTimerRef.current = null
      connectRef.current()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  // When the page comes back, wake the meter and replace a mic that ended in the background.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      audioCtxRef.current?.resume().catch(() => {})
      const ended = streamRef.current?.getAudioTracks().some((t) => t.readyState === 'ended')
      if (!wantRunningRef.current || !ended) return
      if (backoffTimerRef.current !== null) clearTimeout(backoffTimerRef.current)
      backoffTimerRef.current = null
      teardownConn()
      setStatus('reconnecting')
      connectRef.current()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [teardownConn])

  // Stop everything if the page is left.
  useEffect(() => cleanup, [cleanup])

  return { start, stop, status, error, countdown, level, attempt }
}
