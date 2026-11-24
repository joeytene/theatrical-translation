import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main>
      <h1>Live Theatre Captions</h1>
      <Link className="btn" to="/transmit">Transmit</Link>
      <Link className="btn" to="/watch">Watch</Link>
    </main>
  )
}
