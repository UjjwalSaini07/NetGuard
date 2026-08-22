import { useScanData } from '../context/ScanDataContext.jsx'

export default function useHealthCheck() {
  const { health } = useScanData()
  return health
}

