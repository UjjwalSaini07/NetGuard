import { useScanData } from '../context/ScanDataContext.jsx'

export default function useFirewallRules() {
  const { firewallRules, loading, error, refetchAll } = useScanData()
  return { data: firewallRules, loading, error, refetch: refetchAll }
}


