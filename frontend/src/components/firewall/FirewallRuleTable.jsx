import { useMemo, useState } from 'react'
import {
  HiMagnifyingGlass,
  HiShieldCheck,
  HiShieldExclamation,
  HiArrowsRightLeft,
  HiArrowRight,
  HiArrowDownLeft,
  HiArrowUpRight,
  HiBarsArrowUp,
  HiBarsArrowDown
} from 'react-icons/hi2'
import StatusPill from '../common/StatusPill.jsx'

export default function FirewallRuleTable({ rules }) {
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortAsc, setSortAsc] = useState(true)

  const permitCount = rules.filter((r) => r.action === 'permit').length
  const denyCount = rules.filter((r) => r.action === 'deny').length

  const filtered = useMemo(() => {
    let items = rules

    if (filter !== 'all') {
      items = items.filter((rule) => rule.action === filter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      items = items.filter(
        (rule) =>
          rule.source.toLowerCase().includes(q) ||
          rule.destination.toLowerCase().includes(q) ||
          rule.protocol.toLowerCase().includes(q) ||
          (rule.port && rule.port.toLowerCase().includes(q)) ||
          (rule.raw_line && rule.raw_line.toLowerCase().includes(q))
      )
    }

    items = [...items].sort((a, b) => {
      const cmp = (a.destination || '').localeCompare(b.destination || '')
      return sortAsc ? cmp : -cmp
    })

    return items
  }, [rules, filter, searchQuery, sortAsc])

  if (rules.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-4">
          <HiShieldCheck className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No Firewall Rules Parsed</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Run a scan with the default Cisco IOS configuration to inspect parsed Access Control Lists (ACLs).
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search source, destination, port, or raw rule..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({rules.length})
            </button>
            <button
              onClick={() => setFilter('permit')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === 'permit'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <HiShieldCheck className="h-3.5 w-3.5" />
              <span>Permit ({permitCount})</span>
            </button>
            <button
              onClick={() => setFilter('deny')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === 'deny'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <HiShieldExclamation className="h-3.5 w-3.5" />
              <span>Deny ({denyCount})</span>
            </button>
          </div>

          <button
            onClick={() => setSortAsc((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 shadow-sm transition-colors"
            title="Toggle sort direction"
          >
            {sortAsc ? <HiBarsArrowUp className="h-4 w-4" /> : <HiBarsArrowDown className="h-4 w-4" />}
            <span className="hidden sm:inline">Dest</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Direction</th>
                <th className="px-5 py-3.5">Source Address</th>
                <th className="px-5 py-3.5">Destination</th>
                <th className="px-5 py-3.5">Protocol / Port</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Raw Cisco IOS ACL Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((rule, index) => (
                <tr key={`${rule.rule_id || rule.raw_line}_${index}`} className="group transition-colors hover:bg-slate-50/80">
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase mono ${
                        rule.direction === 'ingress'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {rule.direction === 'ingress' ? (
                        <HiArrowDownLeft className="h-3 w-3" />
                      ) : (
                        <HiArrowUpRight className="h-3 w-3" />
                      )}
                      <span>{rule.direction}</span>
                    </span>
                  </td>

                  <td className="mono px-5 py-3.5 text-xs font-semibold text-slate-800">
                    {rule.source === 'any' ? (
                      <span className="text-slate-400 font-normal">any (0.0.0.0/0)</span>
                    ) : (
                      rule.source
                    )}
                  </td>

                  <td className="mono px-5 py-3.5 text-xs font-semibold text-slate-800">
                    {rule.destination === 'any' ? (
                      <span className="text-slate-400 font-normal">any (0.0.0.0/0)</span>
                    ) : (
                      rule.destination
                    )}
                  </td>

                  <td className="mono px-5 py-3.5 text-xs">
                    <span className="text-slate-800 uppercase font-bold">{rule.protocol}</span>
                    {rule.port ? (
                      <span className="text-indigo-600 font-bold ml-1.5">:{rule.port}</span>
                    ) : (
                      <span className="text-slate-400 ml-1.5">—</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <StatusPill status={rule.action} />
                  </td>

                  <td className="px-5 py-3.5">
                    <code className="mono rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-800 border border-slate-200 block max-w-md truncate">
                      {rule.raw_line || `${rule.action} ${rule.protocol} ${rule.source} ${rule.destination}`}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}



