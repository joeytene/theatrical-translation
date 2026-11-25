import { useTheme } from '../hooks/useTheme'
import { PRESETS } from '../lib/theme'

// Preset swatches plus custom text and background colours.
export default function ThemePicker() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="theme-picker">
      <div className="btn-row">
        {PRESETS.map((p) => {
          const selected = p.textColor === theme.textColor && p.bgColor === theme.bgColor
          return (
            <button
              key={p.name}
              className={'swatch' + (selected ? ' selected' : '')}
              style={{ color: p.textColor, background: p.bgColor }}
              onClick={() => setTheme({ textColor: p.textColor, bgColor: p.bgColor })}
              aria-label={p.name}
              title={p.name}
            >
              Aa
            </button>
          )
        })}
      </div>
      <div className="btn-row color-pickers">
        <label>
          Text
          <input
            type="color"
            value={theme.textColor}
            onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
          />
        </label>
        <label>
          Background
          <input
            type="color"
            value={theme.bgColor}
            onChange={(e) => setTheme({ ...theme, bgColor: e.target.value })}
          />
        </label>
      </div>
    </div>
  )
}
