export default function JoinCode({ code }: { code: string }) {
  return (
    <div>
      <div>Join code</div>
      <div className="big-code">{code}</div>
    </div>
  )
}
