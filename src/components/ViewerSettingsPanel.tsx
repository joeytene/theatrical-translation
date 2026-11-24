import {
  clampFont,
  MAX_FONT,
  MIN_FONT,
  PRESETS,
  type ViewerSettings,
} from '../lib/viewerSettings'

type Props = {
  settings: ViewerSettings
  onChange: (s: ViewerSettings) => void
  onDone: () => void
}

const POSITIONS = ['top', 'middle', 'bottom'] as const

// Full-screen sheet where a viewer picks caption size, position and colors.
export default function ViewerSettingsPanel({ settings, onChange, onDone }: Props) {
  const set = (patch: Partial<ViewerSettings>) => onChange({ ...settings, ...patch })

  return (
    <div className="settings-panel" role="dialog" aria-label="Caption settings">
      <div className="settings-inner">
        <h2>Set up your captions</h2>

        <div
          className="settings-preview"
          style={{
            fontSize: settings.fontSize,
            color: settings.textColor,
            background: settings.bgColor,
          }}
        >
          The quick brown fox jumps over the lazy dog.
        </div>

        <section>
          <h3>Size</h3>
          <div className="btn-row">
            <button onClick={() => set({ fontSize: clampFont(settings.fontSize - 4) })}>A−</button>
            <input
              type="range"
              className="grow"
              min={MIN_FONT}
              max={MAX_FONT}
              value={settings.fontSize}
              onChange={(e) => set({ fontSize: clampFont(Number(e.target.value)) })}
              aria-label="Font size"
            />
            <button onClick={() => set({ fontSize: clampFont(settings.fontSize + 4) })}>A+</button>
          </div>
        </section>

        <section>
          <h3>Position</h3>
          <div className="segmented">
            {POSITIONS.map((p) => (
              <button
                key={p}
                className={settings.position === p ? 'selected' : ''}
                onClick={() => set({ position: p })}
              >
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>Colors</h3>
          <div className="btn-row">
            {PRESETS.map((p) => {
              const selected = p.textColor === settings.textColor && p.bgColor === settings.bgColor
              return (
                <button
                  key={p.name}
                  className={'swatch' + (selected ? ' selected' : '')}
                  style={{ color: p.textColor, background: p.bgColor }}
                  onClick={() => set({ textColor: p.textColor, bgColor: p.bgColor })}
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
                value={settings.textColor}
                onChange={(e) => set({ textColor: e.target.value })}
              />
            </label>
            <label>
              Background
              <input
                type="color"
                value={settings.bgColor}
                onChange={(e) => set({ bgColor: e.target.value })}
              />
            </label>
          </div>
        </section>

        <button className="done" onClick={onDone}>Done</button>
      </div>
    </div>
  )
}
