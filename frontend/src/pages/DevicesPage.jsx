import PageContainer from '../components/layout/PageContainer.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import ErrorBanner from '../components/common/ErrorBanner.jsx'
import DeviceTable from '../components/devices/DeviceTable.jsx'
import useDevices from '../hooks/useDevices.js'

export default function DevicesPage() {
  const { data, loading, error } = useDevices()

  return (
    <PageContainer title="Devices">
      {error && <ErrorBanner message={error} />}
      {loading ? <LoadingSpinner /> : <DeviceTable devices={data} />}
    </PageContainer>
  )
}
