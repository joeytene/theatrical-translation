import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchClientSecret } from '../lib/api'

export type SessionStatus = 'idle' | 'requesting-mic' | 'connecting' | 'live' | 'error'

export function useTranslationSession(onDelta: (d: string) => void) {
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Keep the latest callback without restarting the session.
  const onDeltaRef = useRef(onDelta)
  onDeltaRef.current = onDelta

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startingRef = useRef(false)
  // Bumped on every cleanup so an in-progress start() knows it was cancelled.
  const runRef = useRef(0)

  // Release the mic and close the connection.
  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    dcRef.current?.close()
    pcRef.current?.close()
    streamRef.current = null
    dcRef.current = null
    pcRef.current = null
    startingRef.current = false
    runRef.current++
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

    // a. Microphone (must be triggered by a tap on iPad Safari)
    setStatus('requesting-mic')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      fail('Microphone access denied. Allow the microphone in your browser settings and try again.')
      return
    }
    if (cancelled()) {
      stream.getTracks().forEach((t) => t.stop()) // Stop was pressed while asking for the mic
      return
    }
    streamRef.current = stream

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
          fail('Connection to OpenAI was lost.')
        }
      }

      // e. Data channel carries the text events
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.onopen = () => setStatus('live')
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
          fail(event.error?.message ?? JSON.stringify(event))
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

      // h. Finish the handshake. Status becomes 'live' when the data channel opens.
      await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() })
    } catch (e) {
      if (cancelled()) return // user pressed Stop; not an error
      fail(e instanceof Error ? e.message : String(e))
    }
  }, [fail, stop])

  // Stop everything if the page is left.
  useEffect(() => cleanup, [cleanup])

  return { start, stop, status, error }
}
