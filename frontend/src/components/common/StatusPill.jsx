export default function StatusPill({ status }) {
  const isPass = status === 'PASS' || status === 'permit'
  const classes = isPass
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : 'bg-red-500/10 text-red-400 border-red-500/30'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold mono ${classes}`}>
      {status}
    </span>
  )
}
