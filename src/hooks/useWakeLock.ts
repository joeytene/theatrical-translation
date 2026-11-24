import { useEffect } from 'react'

// Keeps the screen awake while `active` is true (if the browser supports it).
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    async function acquire() {
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelled) l.release().catch(() => {})
        else lock = l
      } catch {
        // Not allowed right now (e.g. low battery). Ignore.
      }
    }

    // Browsers drop the lock when the tab is hidden, so ask again on return.
    function onVisible() {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [active])
}
