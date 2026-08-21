export default function CisSummaryBadges({ summary }) {
  const items = [
    { label: 'Total Checks', value: summary.total, tone: 'text-zinc-200' },
    { label: 'Passed', value: summary.passed, tone: 'text-emerald-400' },
    { label: 'Failed', value: summary.failed, tone: 'text-red-400' }
  ]

  return (
    <div className="mb-6 grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <div className={`text-2xl font-bold ${item.tone}`}>{item.value}</div>
          <div className="text-xs text-zinc-500">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
