import { useMemo, useState } from 'react'
import StatusPill from '../common/StatusPill.jsx'

export default function FirewallRuleTable({ rules }) {
  const [filter, setFilter] = useState('all')
  const [sortAsc, setSortAsc] = useState(true)

  const filtered = useMemo(() => {
    let items = filter === 'all' ? rules : rules.filter((rule) => rule.action === filter)
    items = [...items].sort((a, b) => {
      const cmp = (a.destination || '').localeCompare(b.destination || '')
      return sortAsc ? cmp : -cmp
    })
    return items
  }, [rules, filter, sortAsc])

  if (rules.length === 0) {
    return <p className="text-sm text-zinc-500">No firewall rules parsed yet. Run a scan to populate this table.</p>
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {['all', 'permit', 'deny'].map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
              filter === option ? 'bg-emerald-500 text-black' : 'bg-surface-raised text-zinc-400'
            }`}
          >
            {option}
          </button>
        ))}
        <button
          onClick={() => setSortAsc((prev) => !prev)}
          className="ml-auto rounded-md bg-surface-raised px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          Sort by destination {sortAsc ? '↑' : '↓'}
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-raised text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Protocol</th>
              <th className="px-4 py-3">Port</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filtered.map((rule) => (
              <tr key={rule.rule_id} className="hover:bg-surface-raised">
                <td className="mono px-4 py-3 text-zinc-300">{rule.source}</td>
                <td className="mono px-4 py-3 text-zinc-300">{rule.destination}</td>
                <td className="mono px-4 py-3 text-zinc-400">{rule.protocol}</td>
                <td className="mono px-4 py-3 text-zinc-400">{rule.port || '—'}</td>
                <td className="px-4 py-3">
                  <StatusPill status={rule.action} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
