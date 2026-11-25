import { markThemeSeen } from '../lib/theme'
import ThemePicker from './ThemePicker'

// First-visit overlay: pick how the screen looks.
export default function ThemeOnboarding({ onClose }: { onClose: () => void }) {
  function finish() {
    markThemeSeen()
    onClose()
  }
  return (
    <div className="settings-panel onboarding" role="dialog" aria-label="Choose colours">
      <div className="settings-inner">
        <h1>Live English captions</h1>
        <p>Choose how the screen looks. You can change this any time with ⚙.</p>
        <ThemePicker />
        <div className="settings-preview" style={{ fontSize: 28 }}>
          The quick brown fox jumps over the lazy dog.
        </div>
        <div className="btn-row">
          <button className="done grow" onClick={finish}>Continue</button>
          <button onClick={finish}>Skip</button>
        </div>
      </div>
    </div>
  )
}
