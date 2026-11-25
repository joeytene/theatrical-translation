import ThemePicker from './ThemePicker'

// Sheet for Home and Transmit: site theme only.
export default function ThemeSettings({ onDone }: { onDone: () => void }) {
  return (
    <div className="settings-panel" role="dialog" aria-label="Colour settings">
      <div className="settings-inner">
        <h2>Colours</h2>
        <ThemePicker />
        <div className="settings-preview" style={{ fontSize: 28 }}>
          The quick brown fox jumps over the lazy dog.
        </div>
        <button className="done" onClick={onDone}>Done</button>
      </div>
    </div>
  )
}
