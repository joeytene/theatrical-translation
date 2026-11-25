import { clampFont, MAX_FONT, MIN_FONT } from '../lib/viewerSettings'

type Props = { value: number; onChange: (n: number) => void }

// A−, slider, A+.
export default function FontSizeControl({ value, onChange }: Props) {
  return (
    <div className="btn-row size-control">
      <button onClick={() => onChange(clampFont(value - 4))} aria-label="Smaller text">A−</button>
      <input
        type="range"
        className="grow"
        min={MIN_FONT}
        max={MAX_FONT}
        value={value}
        onChange={(e) => onChange(clampFont(Number(e.target.value)))}
        aria-label="Font size"
      />
      <button onClick={() => onChange(clampFont(value + 4))} aria-label="Larger text">A+</button>
    </div>
  )
}
