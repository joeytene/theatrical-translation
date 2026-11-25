import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Transmit from './pages/Transmit'
import Watch from './pages/Watch'
import Debug from './pages/Debug'
import ThemeOnboarding from './components/ThemeOnboarding'
import PasswordGate from './components/PasswordGate'
import { hasSeenTheme } from './lib/theme'

export default function App() {
  // Projector links skip onboarding.
  const [onboarding, setOnboarding] = useState(
    () => !hasSeenTheme() && !new URLSearchParams(location.search).has('projector'),
  )
  return (
    <PasswordGate>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/transmit" element={<Transmit />} />
        <Route path="/watch" element={<Watch />} />
        <Route path="/debug" element={<Debug />} />
      </Routes>
      {onboarding && <ThemeOnboarding onClose={() => setOnboarding(false)} />}
    </PasswordGate>
  )
}
