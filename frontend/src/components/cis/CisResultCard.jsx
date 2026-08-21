import StatusPill from '../common/StatusPill.jsx'

export default function CisResultCard({ result }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-zinc-100">{result.title}</h4>
        <StatusPill status={result.status} />
      </div>
      <p className="mono mb-3 text-xs text-zinc-500">{result.cis_reference}</p>
      <p className="mb-3 text-sm text-zinc-300">{result.evidence}</p>
      {result.affected_items?.length > 0 && (
        <div className="space-y-1">
          {result.affected_items.map((item, index) => (
            <div key={index} className="mono truncate rounded bg-surface px-2 py-1 text-xs text-zinc-500">
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
