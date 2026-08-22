import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import client from '../api/client.js'

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
    latency: null,
    checking: true,
    lastChecked: null
  })

  const safePollInterval = 300000

  const checkHealth = useCallback(async () => {
    const start = performance.now()
    try {
      const response = await client.get('/health', { timeout: 3000 })
      if (response.data && response.data.status === 'ok') {
        setHealth({
          isOnline: true,
          dynamodb: response.data.dynamodb || 'ok',
          runtimeMode: response.data.runtime_mode || 'local',
          latency: Math.round(performance.now() - start),
          checking: false,
          lastChecked: Date.now()
        })
      } else {
        setHealth({
          isOnline: false,
          dynamodb: 'error',
          runtimeMode: 'unknown',
          latency: null,
          checking: false,
          lastChecked: Date.now()
        })
      }
    } catch {
      setHealth({
        isOnline: false,
        dynamodb: 'error',
        runtimeMode: 'unknown',
        latency: null,
        checking: false,
        lastChecked: Date.now()
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
        const elapsed = health.lastChecked ? Date.now() - health.lastChecked : Infinity
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
  }, [checkHealth, health.lastChecked, safePollInterval])


  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [devRes, cisRes, fwRes] = await Promise.allSettled([
        client.get('/devices'),
        client.get('/cis-results'),
        client.get('/firewall-rules')
      ])

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
      }

      if (fwRes.status === 'fulfilled' && fwRes.value.data) {
        const items = fwRes.value.data.items || []
        setFirewallRules(items)
      }

      if (newestTimestamp) {
        setLastScanTimestamp(newestTimestamp)
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
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



