import { useScanData } from '../context/ScanDataContext.jsx'

export default function useCisResults() {
  const { cisResults, cisSummary, loading, error, refetchAll } = useScanData()
  return { data: cisResults, summary: cisSummary, loading, error, refetch: refetchAll }
}



