// Fixed top-right gear, clear of iOS safe areas.
export default function TopBar({ onClick }: { onClick: () => void }) {
  return (
    <button className="gear" onClick={onClick} aria-label="Settings">
      ⚙
    </button>
  )
}
