import PageContainer from '../components/layout/PageContainer.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import ErrorBanner from '../components/common/ErrorBanner.jsx'
import CisResultCard from '../components/cis/CisResultCard.jsx'
import CisSummaryBadges from '../components/cis/CisSummaryBadges.jsx'
import useCisResults from '../hooks/useCisResults.js'

export default function CisResultsPage() {
  const { data, summary, loading, error } = useCisResults()

  return (
    <PageContainer title="CIS Benchmark Results">
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <CisSummaryBadges summary={summary} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.map((result) => (
              <CisResultCard key={result.check_id} result={result} />
            ))}
          </div>
          {data.length === 0 && <p className="text-sm text-zinc-500">No CIS results yet — run a scan.</p>}
        </>
      )}
    </PageContainer>
  )
}
