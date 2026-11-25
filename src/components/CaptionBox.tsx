import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { clampBox, type Box } from '../lib/viewerSettings'

type Props = {
  text: string
  fontSize: number | string // px, or a CSS size (projector)
  box: Box
  editing?: boolean
  onBoxChange?: (b: Box) => void
}

const SAMPLE = 'Sample caption text. Drag this box where you want it, and resize it from the corner.'
const NUDGE = 0.02

type Drag = { id: number; mode: 'move' | 'resize'; sx: number; sy: number; start: Box }

// Size of the stage (the screen minus safe areas), in px. Measured from the element rather
// than visualViewport so pinch-zoom and the iOS keyboard don't resize the box.
function useStageSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [s, setS] = useState(() => ({ vw: window.innerWidth, vh: window.innerHeight }))
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const vw = el.clientWidth
      const vh = el.clientHeight
      if (vw > 0 && vh > 0) setS((p) => (p.vw === vw && p.vh === vh ? p : { vw, vh }))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return s
}

// The caption area: positioned from stage fractions, auto-scrolls to the newest text,
// and can be dragged and resized while `editing`.
export default function CaptionBox({ text, fontSize, box, editing = false, onBoxChange }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const { vw, vh } = useStageSize(stageRef)
  const numericFont = typeof fontSize === 'number' ? fontSize : 48
  const [live, setLive] = useState<Box | null>(null) // while dragging
  const liveRef = useRef<Box | null>(null)
  const drag = useRef<Drag | null>(null)
  const fit = (b: Box) => clampBox(b, vw, vh, numericFont)
  const shown = fit(live ?? box)

  // Stick to the newest text unless the viewer scrolled up.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(true)
  useEffect(() => {
    const el = scrollRef.current
    if (el && stuck) el.scrollTop = el.scrollHeight
  }, [text, stuck, fontSize, shown.w, shown.h])

  // Leaving layout mode mid-gesture drops the drag.
  useEffect(() => {
    if (!editing) {
      drag.current = null
      liveRef.current = null
      setLive(null)
    }
  }, [editing])

  function onScroll() {
    const el = scrollRef.current
    if (el) setStuck(el.scrollHeight - el.scrollTop - el.clientHeight <= 40)
  }

  function jumpToLive() {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
    setStuck(true)
  }

  function begin(e: React.PointerEvent, mode: Drag['mode']) {
    if (!editing) return
    e.stopPropagation()
    // One pointer at a time: a second finger is ignored. Mouse: left button only.
    if (drag.current || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, mode, sx: e.clientX, sy: e.clientY, start: shown }
  }

  function move(e: React.PointerEvent) {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    const dx = (e.clientX - d.sx) / vw
    const dy = (e.clientY - d.sy) / vh
    const s = d.start
    const next = fit(
      d.mode === 'move'
        ? { ...s, x: s.x + dx, y: s.y + dy }
        : { ...s, w: Math.min(s.w + dx, 1 - s.x), h: Math.min(s.h + dy, 1 - s.y) },
    )
    liveRef.current = next
    setLive(next)
  }

  function end(e: React.PointerEvent) {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    const last = liveRef.current
    liveRef.current = null
    if (last) onBoxChange?.(last)
    setLive(null)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-NUDGE, 0],
      ArrowRight: [NUDGE, 0],
      ArrowUp: [0, -NUDGE],
      ArrowDown: [0, NUDGE],
    }
    const s = step[e.key]
    if (!editing || !s) return
    e.preventDefault()
    const b = shown
    onBoxChange?.(
      fit(
        e.shiftKey
          ? { ...b, w: Math.min(b.w + s[0], 1 - b.x), h: Math.min(b.h + s[1], 1 - b.y) }
          : { ...b, x: b.x + s[0], y: b.y + s[1] },
      ),
    )
  }

  const shownText = text || (editing ? SAMPLE : '')

  // Pointer events bubble from the resize handle to the box, so the box's handlers
  // alone cover both (the handle only starts a resize).
  return (
    <div className="caption-stage" ref={stageRef}>
      <div
        className={'caption-area' + (editing ? ' editing' : '')}
        style={{
          left: shown.x * vw,
          top: shown.y * vh,
          width: shown.w * vw,
          height: shown.h * vh,
        }}
        tabIndex={editing ? 0 : undefined}
        aria-label={editing ? 'Caption box. Drag to move, or use arrow keys. Shift and arrows resize.' : undefined}
        onPointerDown={(e) => begin(e, 'move')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDown={onKeyDown}
      >
        <div className="caption-scroll" ref={scrollRef} onScroll={onScroll} style={{ fontSize }}>
          {shownText}
        </div>
        {!stuck && !editing && (
          <button className="jump-live" onClick={jumpToLive}>Jump to live ↓</button>
        )}
        {editing && (
          <div
            className="resize-handle"
            onPointerDown={(e) => begin(e, 'resize')}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}
