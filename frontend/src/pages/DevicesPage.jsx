import { HiArrowPath } from 'react-icons/hi2'
import PageContainer from '../components/layout/PageContainer.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import ErrorBanner from '../components/common/ErrorBanner.jsx'
import DeviceTable from '../components/devices/DeviceTable.jsx'
import useDevices from '../hooks/useDevices.js'

export default function DevicesPage() {
  const { data, loading, error, refetch } = useDevices()

  return (
    <PageContainer
      title="Network Asset Inventory"
      subtitle={`Discovered IP endpoints, hardware vendors, and listening services (${data.length} total)`}
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
      {loading ? <LoadingSpinner label="Fetching network asset inventory..." /> : <DeviceTable devices={data} />}
    </PageContainer>
  )
}


