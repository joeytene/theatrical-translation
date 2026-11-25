import { useState } from 'react'
import { Link } from 'react-router-dom'
import ThemeSettings from '../components/ThemeSettings'
import TopBar from '../components/TopBar'

export default function Home() {
  const [showTheme, setShowTheme] = useState(false)
  return (
    <main>
      <TopBar onClick={() => setShowTheme(true)} />
      <h1>Live Theatre Captions</h1>
      <p>Scan the QR code on the screen, or tap Watch and enter the code.</p>
      <Link className="btn primary" to="/watch">Watch</Link>
      <Link className="btn secondary" to="/transmit">Transmit · For the operator</Link>
      {showTheme && <ThemeSettings onDone={() => setShowTheme(false)} />}
    </main>
  )
}
