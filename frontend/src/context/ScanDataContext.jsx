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
    latency: null,
    checking: true,
    lastChecked: null
  })

  const healthMode = import.meta.env.VITE_HEALTH_MODE || 'DevMode'
  const isDevMode = healthMode === 'DevMode'
  const pollInterval = isDevMode ? 10000 : 60000

  const checkHealth = useCallback(async () => {
    const start = performance.now()
    try {
      const response = await client.get('/health', { timeout: 3000 })
      if (response.data && response.data.status === 'ok') {
        setHealth({
          isOnline: true,
          latency: Math.round(performance.now() - start),
          checking: false,
          lastChecked: new Date()
        })
      } else {
        setHealth({
          isOnline: false,
          latency: null,
          checking: false,
          lastChecked: new Date()
        })
      }
    } catch {
      setHealth({
        isOnline: false,
        latency: null,
        checking: false,
        lastChecked: new Date()
      })
    }
  }, [])

  useEffect(() => {
    let timerId

    const runProbe = () => {
      if (document.visibilityState === 'hidden' && !isDevMode) {
        return
      }
      checkHealth()
    }

    runProbe()
    timerId = setInterval(runProbe, pollInterval)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runProbe()
        clearInterval(timerId)
        timerId = setInterval(runProbe, pollInterval)
      } else if (!isDevMode) {
        clearInterval(timerId)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(timerId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkHealth, isDevMode, pollInterval])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [devRes, cisRes, fwRes] = await Promise.allSettled([
        client.get('/devices'),
        client.get('/cis-results'),
        client.get('/firewall-rules')
      ])

      if (devRes.status === 'fulfilled' && devRes.value.data) {
        const raw = devRes.value.data.items || []
        const dMap = new Map()
        raw.forEach((item) => {
          if (item.ip_address && !dMap.has(item.ip_address)) {
            dMap.set(item.ip_address, item)
          }
        })
        setDevices(Array.from(dMap.values()))
      }

      if (cisRes.status === 'fulfilled' && cisRes.value.data) {
        const raw = cisRes.value.data.items || []
        const cMap = new Map()
        raw.forEach((item) => {
          if (item.check_id && !cMap.has(item.check_id)) {
            cMap.set(item.check_id, item)
          }
        })
        const items = Array.from(cMap.values())
        const passed = items.filter((i) => i.status === 'PASS').length
        setCisResults(items)
        setCisSummary({
          total: items.length,
          passed,
          failed: items.length - passed
        })
      }

      if (fwRes.status === 'fulfilled' && fwRes.value.data) {
        const raw = fwRes.value.data.items || []
        const fMap = new Map()
        raw.forEach((item) => {
          const sig = item.raw_line || `${item.action}_${item.protocol}_${item.source}_${item.destination}_${item.port || ''}`
          if (!fMap.has(sig)) {
            fMap.set(sig, item)
          }
        })
        setFirewallRules(Array.from(fMap.values()))
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
      setDevices((prev) => {
        const dMap = new Map()
        scanPayload.devices.forEach((d) => {
          if (d.ip_address) dMap.set(d.ip_address, d)
        })
        prev.forEach((d) => {
          if (d.ip_address && !dMap.has(d.ip_address)) {
            dMap.set(d.ip_address, d)
          }
        })
        return Array.from(dMap.values())
      })
    }

    if (Array.isArray(scanPayload.cis_results)) {
      setCisResults((prev) => {
        const cMap = new Map()
        scanPayload.cis_results.forEach((c) => {
          if (c.check_id) cMap.set(c.check_id, c)
        })
        prev.forEach((c) => {
          if (c.check_id && !cMap.has(c.check_id)) {
            cMap.set(c.check_id, c)
          }
        })
        const items = Array.from(cMap.values())
        const passed = items.filter((i) => i.status === 'PASS').length
        setCisSummary({
          total: items.length,
          passed,
          failed: items.length - passed
        })
        return items
      })
    }

    if (Array.isArray(scanPayload.firewall_rules)) {
      setFirewallRules((prev) => {
        const fMap = new Map()
        scanPayload.firewall_rules.forEach((r) => {
          const sig = r.raw_line || `${r.action}_${r.protocol}_${r.source}_${r.destination}_${r.port || ''}`
          fMap.set(sig, r)
        })
        prev.forEach((r) => {
          const sig = r.raw_line || `${r.action}_${r.protocol}_${r.source}_${r.destination}_${r.port || ''}`
          if (!fMap.has(sig)) {
            fMap.set(sig, r)
          }
        })
        return Array.from(fMap.values())
      })
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

