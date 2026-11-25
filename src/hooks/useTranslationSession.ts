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

const CONNECT_ERROR = "Couldn't connect to the translation service. Try again."

export function useTranslationSession(onDelta: (d: string) => void) {
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [level, setLevel] = useState(0)

  // Keep the latest callback without restarting the session.
  const onDeltaRef = useRef(onDelta)
  onDeltaRef.current = onDelta

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startingRef = useRef(false)
  const timersRef = useRef<number[]>([])
  const rafRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const meterStreamRef = useRef<MediaStream | null>(null)
  // Bumped on every cleanup so an in-progress start() knows it was cancelled.
  const runRef = useRef(0)

  // Release the mic and close the connection.
  const cleanup = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    cancelAnimationFrame(rafRef.current)
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    meterStreamRef.current?.getTracks().forEach((t) => t.stop())
    meterStreamRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    dcRef.current?.close()
    pcRef.current?.close()
    streamRef.current = null
    dcRef.current = null
    pcRef.current = null
    startingRef.current = false
    runRef.current++
    setCountdown(null)
    setLevel(0)
  }, [])

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

  const start = useCallback(async () => {
    if (startingRef.current || pcRef.current) return // already running
    startingRef.current = true
    const runId = runRef.current
    const cancelled = () => runRef.current !== runId
    setError(null)

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

    // a. Microphone (must be triggered by a tap on iPad Safari)
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

    try {
      // b. Short-lived token from our server
      setStatus('connecting')
      const { value } = await fetchClientSecret()
      if (cancelled()) return

      // c. Peer connection with the mic track
      const pc = new RTCPeerConnection()
      pcRef.current = pc
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream))

      // d. Deliberately ignore the remote English audio: playing it would echo into the mic.
      pc.ontrack = () => {}

      pc.onconnectionstatechange = () => {
        // 'disconnected' often recovers on its own, so only give up on 'failed'.
        if (pc.connectionState === 'failed') {
          fail('Connection lost.')
        }
      }

      // e. Data channel carries the text events
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.onopen = () => {
        if (cancelled()) return
        setStatus('connected')
        // Short pause, then count 3, 2, 1 before going live.
        const later = (fn: () => void, ms: number) => {
          timersRef.current.push(window.setTimeout(() => !cancelled() && fn(), ms))
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
          setCountdown(null)
          setStatus('live')
        }, 3800)
      }
      dc.onmessage = (msg) => {
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
          console.error(event.error?.message ?? JSON.stringify(event))
          fail(CONNECT_ERROR)
        } else if (event.type === 'session.closed') {
          stop()
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
      if (cancelled()) return // user pressed Stop; not an error
      console.error(e)
      fail(CONNECT_ERROR)
    }
  }, [fail, stop])

  // Stop everything if the page is left.
  useEffect(() => cleanup, [cleanup])

  return { start, stop, status, error, countdown, level }
}
