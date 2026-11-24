import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Transmit from './pages/Transmit'
import Watch from './pages/Watch'
import Debug from './pages/Debug'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/transmit" element={<Transmit />} />
      <Route path="/watch" element={<Watch />} />
      <Route path="/debug" element={<Debug />} />
    </Routes>
  )
}
