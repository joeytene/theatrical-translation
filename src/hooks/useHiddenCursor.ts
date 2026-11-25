import { useEffect } from 'react'

// Hide the mouse cursor after 3 s without movement; show it again on move.
export function useHiddenCursor(active: boolean) {
  useEffect(() => {
    if (!active) return
    let timer = 0
    function show() {
      document.body.style.cursor = ''
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        document.body.style.cursor = 'none'
      }, 3000)
    }
    show()
    window.addEventListener('mousemove', show)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', show)
      document.body.style.cursor = ''
    }
  }, [active])
}
