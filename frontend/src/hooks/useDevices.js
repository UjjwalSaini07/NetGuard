import { useScanData } from '../context/ScanDataContext.jsx'

export default function useDevices() {
  const { devices, loading, error, refetchAll } = useScanData()
  return { data: devices, loading, error, refetch: refetchAll }
}



