import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useBroadcastSubscriber } from '../hooks/useBroadcast'
import { useHiddenCursor } from '../hooks/useHiddenCursor'
import { useWakeLock } from '../hooks/useWakeLock'
import CaptionBox from '../components/CaptionBox'
import TextSizeSheet from '../components/TextSizeSheet'
import TopBar from '../components/TopBar'
import ViewerSettingsPanel from '../components/ViewerSettingsPanel'
import { normalizeCode } from '../lib/joinCode'
import {
  DEFAULT_BOX,
  hasSeenSetup,
  loadSettings,
  markSetupSeen,
  saveSettings,
  type Box,
  type ViewerSettings,
} from '../lib/viewerSettings'
import { supabaseConfigError } from '../lib/supabase'

// Projector: full-width area in the bottom third, ignoring saved layout.
const PROJECTOR_BOX: Box = { x: 0.02, y: 0.58, w: 0.96, h: 0.4 }
const PROJECTOR_FONT = 'clamp(40px, 5vw, 120px)'

type Step = 'size' | 'layout' | 'settings' | null

export default function Watch() {
  const [params, setParams] = useSearchParams()
  const code = normalizeCode(params.get('code') ?? '') || null
  const projector = params.has('projector')
  const [input, setInput] = useState('')
  const { text, lastMessageAt, status } = useBroadcastSubscriber(code)
  useWakeLock(code !== null)
  useHiddenCursor(projector && code !== null)

  // Display settings, saved on this device. First join walks through size, then layout.
  const [settings, setSettings] = useState(loadSettings)
  const [step, setStep] = useState<Step>(() => (!projector && !hasSeenSetup() ? 'size' : null))

  function updateSettings(s: ViewerSettings) {
    setSettings(s)
    saveSettings(s)
  }

  function finishLayout() {
    markSetupSeen()
    setStep(null)
  }

  if (!code) {
    return (
      <main className="join-screen">
        <h1>Watch</h1>
        <form
          className="join-form"
          onSubmit={(e) => {
            e.preventDefault()
            const c = normalizeCode(input)
            if (c) setParams(projector ? { code: c, projector: '' } : { code: c })
          }}
        >
          <input
            className="code-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={4}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="CODE"
            aria-label="Join code"
          />
          <button type="submit" className="done">Join</button>
        </form>
        <Link className="btn secondary" to="/">Home</Link>
      </main>
    )
  }

  const caption =
    text || (status === 'connected' && lastMessageAt === null ? 'Waiting for transmitter…' : '')

  if (projector) {
    return (
      <div className="watch-screen">
        <CaptionBox text={caption} fontSize={PROJECTOR_FONT} box={PROJECTOR_BOX} />
      </div>
    )
  }

  const layout = step === 'layout'
  // Put the toolbar in the half of the screen the box isn't in.
  const toolbarTop = settings.box.y + settings.box.h / 2 > 0.5

  return (
    <div className="watch-screen">
      <div className="watch-chrome">
        <span>
          Code {code} · {status === 'connected' ? 'connected' : status === 'off' ? 'not configured' : 'Reconnecting…'}
        </span>
        <Link className="chrome-btn" to="/watch">Change code</Link>
      </div>
      <TopBar onClick={() => setStep('settings')} />
      {supabaseConfigError && <p className="err watch-err">{supabaseConfigError}</p>}

      <CaptionBox
        text={caption}
        fontSize={settings.fontSize}
        box={settings.box}
        editing={layout}
        onBoxChange={(box) => updateSettings({ ...settings, box })}
      />

      {layout && (
        <div className={'layout-bar ' + (toolbarTop ? 'at-top' : 'at-bottom')}>
          <span>Drag to move · drag the corner to resize</span>
          <button onClick={() => updateSettings({ ...settings, box: DEFAULT_BOX })}>Reset</button>
          <button className="done" onClick={finishLayout}>Done</button>
        </div>
      )}

      {step === 'size' && (
        <TextSizeSheet
          fontSize={settings.fontSize}
          onChange={(fontSize) => updateSettings({ ...settings, fontSize })}
          onNext={() => setStep('layout')}
        />
      )}
      {step === 'settings' && (
        <ViewerSettingsPanel
          settings={settings}
          onChange={updateSettings}
          onAdjust={() => setStep('layout')}
          onDone={finishLayout}
        />
      )}
    </div>
  )
}
