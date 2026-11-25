import FontSizeControl from './FontSizeControl'
import ThemePicker from './ThemePicker'
import type { ViewerSettings } from '../lib/viewerSettings'

type Props = {
  settings: ViewerSettings
  onChange: (s: ViewerSettings) => void
  onAdjust: () => void
  onDone: () => void
}

// Full-screen sheet for the gear on Watch: colours, text size, box position.
export default function ViewerSettingsPanel({ settings, onChange, onAdjust, onDone }: Props) {
  return (
    <div className="settings-panel" role="dialog" aria-label="Caption settings">
      <div className="settings-inner">
        <h2>Caption settings</h2>

        <div className="settings-preview" style={{ fontSize: settings.fontSize }}>
          The quick brown fox jumps over the lazy dog.
        </div>

        <section>
          <h3>Colours</h3>
          <ThemePicker />
        </section>

        <section>
          <h3>Text size</h3>
          <FontSizeControl
            value={settings.fontSize}
            onChange={(fontSize) => onChange({ ...settings, fontSize })}
          />
        </section>

        <section>
          <h3>Position</h3>
          <button onClick={onAdjust}>Adjust caption position</button>
        </section>

        <button className="done" onClick={onDone}>Done</button>
      </div>
    </div>
  )
}
