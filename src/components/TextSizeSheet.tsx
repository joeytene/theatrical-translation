import FontSizeControl from './FontSizeControl'

type Props = { fontSize: number; onChange: (n: number) => void; onNext: () => void }

// First-join sheet: pick the text size, then go on to place the box.
export default function TextSizeSheet({ fontSize, onChange, onNext }: Props) {
  return (
    <div className="settings-panel" role="dialog" aria-label="Text size">
      <div className="settings-inner">
        <h2>Text size</h2>
        <FontSizeControl value={fontSize} onChange={onChange} />
        <div className="settings-preview" style={{ fontSize }}>
          The quick brown fox jumps over the lazy dog.
        </div>
        <button className="done" onClick={onNext}>Next</button>
      </div>
    </div>
  )
}
