import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type BroadcastStatus = 'connecting' | 'connected' | 'error' | 'off'

function mapStatus(s: string): BroadcastStatus {
  if (s === 'SUBSCRIBED') return 'connected'
  if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') return 'error'
  return 'connecting' // 'CLOSED' etc.
}

// Transmitter side: buffer deltas and send them in batches.
export function useBroadcastPublisher(code: string) {
  const [status, setStatus] = useState<BroadcastStatus>(supabase ? 'connecting' : 'off')
  const bufferRef = useRef('')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    const channel = client.channel(`room:${code}`, {
      config: { broadcast: { self: false } },
    })
    channelRef.current = channel
    subscribedRef.current = false
    channel.subscribe((s) => {
      // The old room's CLOSED arrives after a code change; ignore it.
      if (channelRef.current !== channel) return
      subscribedRef.current = s === 'SUBSCRIBED'
      setStatus(mapStatus(s))
    })

    // Send what we've collected every 300ms (fewer, bigger messages).
    const timer = setInterval(() => {
      if (bufferRef.current && subscribedRef.current) {
        channel.send({
          type: 'broadcast',
          event: 'caption',
          payload: { speaker: 'Speaker 1', text: bufferRef.current, ts: Date.now() },
        })
        bufferRef.current = ''
      }
    }, 300)

    return () => {
      clearInterval(timer)
      channelRef.current = null
      subscribedRef.current = false
      client.removeChannel(channel)
    }
  }, [code])

  const push = useCallback((delta: string) => {
    if (supabase) bufferRef.current += delta
  }, [])

  // Empty the buffer and tell viewers to wipe their captions.
  const clear = useCallback(() => {
    bufferRef.current = ''
    if (subscribedRef.current) {
      channelRef.current?.send({ type: 'broadcast', event: 'clear', payload: { ts: Date.now() } })
    }
  }, [])

  return { push, clear, status }
}

// Viewer side: listen for captions and keep the most recent text.
export function useBroadcastSubscriber(code: string | null) {
  const [text, setText] = useState('')
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null)
  const [status, setStatus] = useState<BroadcastStatus>(supabase ? 'connecting' : 'off')

  useEffect(() => {
    if (!supabase || !code) return
    const client = supabase
    setText('')
    setLastMessageAt(null)
    const channel: RealtimeChannel = client
      .channel(`room:${code}`)
      .on('broadcast', { event: 'caption' }, ({ payload }) => {
        // Keep only the last 2000 characters so memory stays small.
        setText((prev) => (prev + String(payload.text ?? '')).slice(-2000))
        setLastMessageAt(Date.now())
      })
      .on('broadcast', { event: 'clear' }, () => setText(''))
      .subscribe((s) => setStatus(mapStatus(s)))

    return () => {
      client.removeChannel(channel)
    }
  }, [code])

  return { text, lastMessageAt, status }
}
