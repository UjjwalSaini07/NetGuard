import PageContainer from '../components/layout/PageContainer.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import ErrorBanner from '../components/common/ErrorBanner.jsx'
import useDevices from '../hooks/useDevices.js'
import useCisResults from '../hooks/useCisResults.js'

export default function DashboardPage() {
  const { data: devices, loading: devicesLoading, error: devicesError } = useDevices()
  const { data: cisResults, summary, loading: cisLoading, error: cisError } = useCisResults()

  const openPortsCount = devices.reduce((total, device) => total + (device.open_ports?.length || 0), 0)

  if (devicesLoading || cisLoading) return <PageContainer title="Dashboard"><LoadingSpinner /></PageContainer>

  return (
    <PageContainer title="Dashboard">
      {(devicesError || cisError) && <ErrorBanner message={devicesError || cisError} />}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Devices" value={devices.length} tone="text-zinc-100" />
        <StatCard label="Open Ports" value={openPortsCount} tone="text-zinc-100" />
        <StatCard label="CIS Passed" value={summary.passed} tone="text-emerald-400" />
        <StatCard label="CIS Failed" value={summary.failed} tone="text-red-400" />
      </div>
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Recent CIS Checks</h3>
        <div className="space-y-2">
          {cisResults.slice(0, 5).map((result) => (
            <div
              key={result.check_id}
              className="flex items-center justify-between rounded-md border border-surface-border bg-surface-raised px-4 py-3"
            >
              <span className="text-sm text-zinc-300">{result.title}</span>
              <span className={result.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'}>{result.status}</span>
            </div>
          ))}
          {cisResults.length === 0 && <p className="text-sm text-zinc-500">No CIS results yet — run a scan.</p>}
        </div>
      </div>
    </PageContainer>
  )
}

function StatCard({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
      <div className={`text-3xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  )
}
