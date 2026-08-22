import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import client from '../api/client.js'

const ScanDataContext = createContext(null)

const readCachedData = () => {
  try {
    const raw = localStorage.getItem('netguard_scan_cache')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

const writeCachedData = (payload) => {
  try {
    localStorage.setItem('netguard_scan_cache', JSON.stringify(payload))
  } catch {}
}

export function ScanDataProvider({ children }) {
  const cached = readCachedData()
  const [devices, setDevices] = useState(cached?.devices || [])
  const [cisResults, setCisResults] = useState(cached?.cisResults || [])
  const [cisSummary, setCisSummary] = useState(cached?.cisSummary || { total: 0, passed: 0, failed: 0 })
  const [firewallRules, setFirewallRules] = useState(cached?.firewallRules || [])
  const [lastScanTimestamp, setLastScanTimestamp] = useState(cached?.lastScanTimestamp || null)
  const [loading, setLoading] = useState(!cached)
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

      let newestTimestamp = null
      let newDevices = []
      let newCis = []
      let newSummary = { total: 0, passed: 0, failed: 0 }
      let newFw = []

      if (devRes.status === 'fulfilled' && devRes.value.data) {
        const raw = devRes.value.data.items || []
        const dMap = new Map()
        raw.forEach((item) => {
          if (item.ip_address && !dMap.has(item.ip_address)) {
            dMap.set(item.ip_address, item)
            const itemTs = item.discovered_at || item.timestamp
            if (itemTs && (!newestTimestamp || itemTs > newestTimestamp)) {
              newestTimestamp = itemTs
            }
          }
        })
        newDevices = Array.from(dMap.values())
        setDevices(newDevices)
      }

      if (cisRes.status === 'fulfilled' && cisRes.value.data) {
        const raw = cisRes.value.data.items || []
        const cMap = new Map()
        raw.forEach((item) => {
          if (item.check_id && !cMap.has(item.check_id)) {
            cMap.set(item.check_id, item)
            const itemTs = item.evaluated_at || item.timestamp
            if (itemTs && (!newestTimestamp || itemTs > newestTimestamp)) {
              newestTimestamp = itemTs
            }
          }
        })
        newCis = Array.from(cMap.values())
        const passed = newCis.filter((i) => i.status === 'PASS').length
        newSummary = {
          total: newCis.length,
          passed,
          failed: newCis.length - passed
        }
        setCisResults(newCis)
        setCisSummary(newSummary)
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
        newFw = Array.from(fMap.values())
        setFirewallRules(newFw)
      }

      setLastScanTimestamp((prev) => {
        const finalTs = newestTimestamp || prev
        writeCachedData({
          devices: newDevices,
          cisResults: newCis,
          cisSummary: newSummary,
          firewallRules: newFw,
          lastScanTimestamp: finalTs
        })
        return finalTs
      })
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

    const ts = scanPayload.timestamp || new Date().toISOString()
    setLastScanTimestamp(ts)

    let updatedDevices = []
    let updatedCis = []
    let updatedSummary = { total: 0, passed: 0, failed: 0 }
    let updatedFw = []

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
        updatedDevices = Array.from(dMap.values())
        return updatedDevices
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
        updatedCis = Array.from(cMap.values())
        const passed = updatedCis.filter((i) => i.status === 'PASS').length
        updatedSummary = {
          total: updatedCis.length,
          passed,
          failed: updatedCis.length - passed
        }
        setCisSummary(updatedSummary)
        return updatedCis
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
        updatedFw = Array.from(fMap.values())
        return updatedFw
      })
    }

    setTimeout(() => {
      writeCachedData({
        devices: updatedDevices.length > 0 ? updatedDevices : devices,
        cisResults: updatedCis.length > 0 ? updatedCis : cisResults,
        cisSummary: updatedSummary.total > 0 ? updatedSummary : cisSummary,
        firewallRules: updatedFw.length > 0 ? updatedFw : firewallRules,
        lastScanTimestamp: ts
      })
    }, 50)
  }, [devices, cisResults, cisSummary, firewallRules])

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


