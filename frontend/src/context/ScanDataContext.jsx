import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import client, { getApiKey } from '../api/client.js'

const ScanDataContext = createContext(null)

export function ScanDataProvider({ children }) {
  const [devices, setDevices] = useState([])
  const [cisResults, setCisResults] = useState([])
  const [cisSummary, setCisSummary] = useState({ total: 0, passed: 0, failed: 0 })
  const [firewallRules, setFirewallRules] = useState([])
  const [lastScanTimestamp, setLastScanTimestamp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [health, setHealth] = useState({
    isOnline: false,
    dynamodb: 'checking',
    runtimeMode: 'local',
    awsRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    latency: null,
    checking: true,
    lastChecked: null
  })

  const lastCheckedRef = useRef(0)
  const safePollInterval = 300000

  const checkHealth = useCallback(async () => {
    const start = performance.now()
    try {
      const response = await client.get('/health', { timeout: 8000 })
      const now = Date.now()
      lastCheckedRef.current = now
      if (response.data && (response.data.status === 'ok' || response.data.status === 'degraded')) {
        setHealth({
          isOnline: true,
          dynamodb: response.data.dynamodb || 'ok',
          runtimeMode: response.data.runtime_mode || 'local',
          awsRegion: response.data.aws_region || import.meta.env.VITE_AWS_REGION || 'us-east-1',
          latency: Math.round(performance.now() - start),
          checking: false,
          lastChecked: now
        })
      } else {
        setHealth({
          isOnline: false,
          dynamodb: 'error',
          runtimeMode: 'unknown',
          awsRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
          latency: null,
          checking: false,
          lastChecked: now
        })
      }
    } catch {
      const now = Date.now()
      lastCheckedRef.current = now
      setHealth({
        isOnline: false,
        dynamodb: 'error',
        runtimeMode: 'unknown',
        awsRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
        latency: null,
        checking: false,
        lastChecked: now
      })
    }
  }, [])

  useEffect(() => {
    let timerId

    const runProbe = () => {
      if (document.visibilityState === 'hidden') {
        return
      }
      checkHealth()
    }

    runProbe()
    timerId = setInterval(runProbe, safePollInterval)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastCheckedRef.current
        if (elapsed > 120000) {
          runProbe()
          clearInterval(timerId)
          timerId = setInterval(runProbe, safePollInterval)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(timerId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkHealth, safePollInterval])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const currentKey = getApiKey()
    if (!currentKey) {
      setDevices([])
      setCisResults([])
      setCisSummary({ total: 0, passed: 0, failed: 0 })
      setFirewallRules([])
      setLoading(false)
      setError('Authentication Required: Please click Set Key in the topbar to enter your NETGUARD_API_KEY.')
      return
    }

    try {
      const [devRes, cisRes, fwRes] = await Promise.allSettled([
        client.get('/devices'),
        client.get('/cis-results'),
        client.get('/firewall-rules')
      ])


      const errorMessages = []
      let newestTimestamp = null

      if (devRes.status === 'fulfilled' && devRes.value.data) {
        const items = devRes.value.data.items || []
        setDevices(items)
        items.forEach((item) => {
          const itemTs = item.discovered_at || item.timestamp
          if (itemTs && (!newestTimestamp || itemTs > newestTimestamp)) {
            newestTimestamp = itemTs
          }
        })
      } else if (devRes.status === 'rejected') {
        const msg = devRes.reason?.response?.data?.detail?.error || devRes.reason?.response?.data?.detail || devRes.reason?.message || 'Failed to load network assets'
        errorMessages.push(`Network Assets: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`)
      }

      if (cisRes.status === 'fulfilled' && cisRes.value.data) {
        const items = cisRes.value.data.items || []
        const summary = cisRes.value.data.summary || {
          total: items.length,
          passed: items.filter((i) => i.status === 'PASS').length,
          failed: items.filter((i) => i.status !== 'PASS').length
        }
        setCisResults(items)
        setCisSummary(summary)
        items.forEach((item) => {
          const itemTs = item.evaluated_at || item.timestamp
          if (itemTs && (!newestTimestamp || itemTs > newestTimestamp)) {
            newestTimestamp = itemTs
          }
        })
      } else if (cisRes.status === 'rejected') {
        const msg = cisRes.reason?.response?.data?.detail?.error || cisRes.reason?.response?.data?.detail || cisRes.reason?.message || 'Failed to load CIS compliance results'
        errorMessages.push(`CIS Audits: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`)
      }

      if (fwRes.status === 'fulfilled' && fwRes.value.data) {
        const items = fwRes.value.data.items || []
        setFirewallRules(items)
      } else if (fwRes.status === 'rejected') {
        const msg = fwRes.reason?.response?.data?.detail?.error || fwRes.reason?.response?.data?.detail || fwRes.reason?.message || 'Failed to load firewall policies'
        errorMessages.push(`Firewall Rules: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`)
      }

      const isAuthError = [devRes, cisRes, fwRes].some(
        (r) => r.status === 'rejected' && (r.reason?.response?.status === 401 || r.reason?.response?.status === 403)
      )

      if (newestTimestamp) {
        setLastScanTimestamp(newestTimestamp)
      }


      if (isAuthError) {
        setError('Authentication Required: Please click Key Settings in the topbar to enter your NETGUARD_API_KEY.')
      } else if (errorMessages.length > 0) {
        setError(errorMessages.join(' | '))
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication Required: Please click Key Settings in the topbar to enter your NETGUARD_API_KEY.')
      } else {
        const detail = err.response?.data?.detail
        if (typeof detail === 'string') {
          setError(detail)
        } else if (Array.isArray(detail)) {
          setError(detail.map((d) => d.msg || d.message || JSON.stringify(d)).join(' | '))
        } else if (detail && typeof detail === 'object') {
          setError(detail.error || detail.message || detail.msg || JSON.stringify(detail))
        } else {
          setError(err.message || 'Failed to load telemetry data')
        }
      }

    } finally {
      setLoading(false)
    }
  }, [])



  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const applyScanResult = useCallback((scanPayload) => {
    if (!scanPayload) return

    if (scanPayload.timestamp) {
      setLastScanTimestamp(scanPayload.timestamp)
    }

    if (Array.isArray(scanPayload.devices)) {
      setDevices(scanPayload.devices)
    }

    if (Array.isArray(scanPayload.cis_results)) {
      const items = scanPayload.cis_results
      const summary = scanPayload.summary || {
        total: items.length,
        passed: items.filter((i) => i.status === 'PASS').length,
        failed: items.filter((i) => i.status !== 'PASS').length
      }
      setCisResults(items)
      setCisSummary(summary)
    }

    if (Array.isArray(scanPayload.firewall_rules)) {
      setFirewallRules(scanPayload.firewall_rules)
    }
  }, [])

  return (
    <ScanDataContext.Provider
      value={{
        devices,
        cisResults,
        cisSummary,
        firewallRules,
        lastScanTimestamp,
        loading,
        error,
        health: { ...health, refetch: checkHealth },
        refetchAll: fetchAll,
        applyScanResult
      }}
    >
      {children}
    </ScanDataContext.Provider>
  )
}

export function useScanData() {
  const context = useContext(ScanDataContext)
  if (!context) {
    throw new Error('useScanData must be used within a ScanDataProvider')
  }
  return context
}



