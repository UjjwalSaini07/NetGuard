import { useState, useMemo } from 'react'
import {
  HiArrowPath,
  HiMagnifyingGlass,
  HiShieldCheck,
  HiShieldExclamation,
  HiDocumentCheck
} from 'react-icons/hi2'
import PageContainer from '../components/layout/PageContainer.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import ErrorBanner from '../components/common/ErrorBanner.jsx'
import CisResultCard from '../components/cis/CisResultCard.jsx'
import CisSummaryBadges from '../components/cis/CisSummaryBadges.jsx'
import useCisResults from '../hooks/useCisResults.js'

export default function CisResultsPage() {
  const { data, summary, loading, error, refetch } = useCisResults()
  const [filter, setFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredResults = useMemo(() => {
    return data.filter((item) => {
      const matchesFilter = filter === 'ALL' || item.status === filter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.cis_reference.toLowerCase().includes(q) ||
        (item.evidence && item.evidence.toLowerCase().includes(q))
      return matchesFilter && matchesSearch
    })
  }, [data, filter, searchQuery])

  return (
    <PageContainer
      title="CIS Security Benchmark Audits"
      subtitle="Center for Internet Security (CIS) Cisco IOS 16 Benchmark compliance and remediation engine"
      action={
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all"
        >
          <HiArrowPath className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingSpinner label="Auditing CIS benchmark recommendations..." />
      ) : (
        <>
          <CisSummaryBadges summary={summary} />

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search benchmark title, rule (e.g. 2.2.6), or evidence..."
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

            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                onClick={() => setFilter('ALL')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({data.length})
              </button>
              <button
                onClick={() => setFilter('FAIL')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === 'FAIL'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                <HiShieldExclamation className="h-3.5 w-3.5" />
                <span>Failed ({summary.failed || 0})</span>
              </button>
              <button
                onClick={() => setFilter('PASS')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === 'PASS'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <HiShieldCheck className="h-3.5 w-3.5" />
                <span>Passed ({summary.passed || 0})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredResults.map((result, index) => (
              <CisResultCard key={`${result.scan_id || ''}_${result.check_id}_${index}`} result={result} />
            ))}
          </div>

          {filteredResults.length === 0 && (
            <div className="glass-card rounded-2xl p-12 text-center border border-slate-200 bg-white shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-4">
                <HiDocumentCheck className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Benchmark Matches</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No CIS results match your current search query or filter selection.
              </p>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}



