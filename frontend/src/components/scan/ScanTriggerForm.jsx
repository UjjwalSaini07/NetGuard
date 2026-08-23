import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  HiXMark,
  HiBolt,
  HiSignal,
  HiGlobeAlt,
  HiComputerDesktop,
  HiServer,
  HiCheckCircle,
  HiShieldCheck,
  HiArrowRight,
  HiArrowPath,
  HiClock,
  HiExclamationTriangle
} from 'react-icons/hi2'
import { FiRadio } from 'react-icons/fi'
import client from '../../api/client.js'
import ErrorBanner from '../common/ErrorBanner.jsx'

function isValidIpv4(ip) {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false
    const num = Number(p)
    return num >= 0 && num <= 255 && (p === '0' || !p.startsWith('0'))
  })
}

function getTargetDetails(targetStr) {
  const trimmed = targetStr.trim()
  if (!trimmed) return null

  if (trimmed.includes('/')) {
    const [ip, prefix, ...rest] = trimmed.split('/')
    if (rest.length > 0 || !isValidIpv4(ip)) {
      return { valid: false, error: 'Invalid IPv4 address base in CIDR notation.' }
    }
    if (!/^\d{1,2}$/.test(prefix)) {
      return { valid: false, error: 'Invalid CIDR prefix length.' }
    }
    const mask = Number(prefix)
    if (mask < 0 || mask > 32) {
      return { valid: false, error: 'CIDR prefix must be between /0 and /32.' }
    }
    if (mask < 24) {
      const count = Math.pow(2, 32 - mask)
      return {
        valid: false,
        error: `Subnet /${mask} expands to ${count.toLocaleString()} hosts. Subnets are limited to /24 (max 256 hosts) to prevent scan timeouts and memory exhaustion.`
      }
    }
    const hostCount = Math.pow(2, 32 - mask)
    return {
      valid: true,
      isSubnet: mask < 32,
      hostCount,
      warning: mask <= 26
        ? `Wide subnet sweep (/${mask}, ~${hostCount} addresses). Active network discovery and port auditing will take ~25–40s. For instant scans, use a specific IP (e.g. 192.168.1.1 or 127.0.0.1).`
        : null
    }
  }

  const items = trimmed.split(',').map((s) => s.trim()).filter(Boolean)
  if (items.length === 0) return { valid: false, error: 'Target list cannot be empty.' }
  const allValid = items.every(isValidIpv4)
  if (!allValid) {
    return { valid: false, error: 'One or more comma-separated IP addresses are invalid (must be 0-255.0-255.0-255.0-255).' }
  }
  if (items.length > 64) {
    return { valid: false, error: `Target list contains ${items.length} hosts. Maximum is 64 comma-separated hosts per sweep.` }
  }
  return {
    valid: true,
    isSubnet: false,
    hostCount: items.length,
    warning: items.length > 8 ? `Auditing ${items.length} individual hosts will take ~15–25 seconds.` : null
  }
}

function isValidTarget(targetStr) {
  const details = getTargetDetails(targetStr)
  return Boolean(details && details.valid)
}


const PUBLIC_PRESETS = [
  { label: 'Cloudflare DNS', target: '1.1.1.1', icon: HiGlobeAlt, est: '~2-4s', desc: 'Public Anycast Node' },
  { label: 'Google DNS', target: '8.8.8.8', icon: HiGlobeAlt, est: '~2-4s', desc: 'Global DNS Node' },
  { label: 'Quad9 DNS', target: '9.9.9.9', icon: HiGlobeAlt, est: '~2-4s', desc: 'Secure Anycast' },
  { label: 'Public DNS Pair', target: '1.1.1.1, 8.8.8.8', icon: HiSignal, est: '~4-6s', desc: 'Multi-host Probe' }
]

const LOCAL_PRESETS = [
  { label: 'Localhost', target: '127.0.0.1', icon: HiComputerDesktop, est: '~1-2s', desc: 'Loopback Host' },
  { label: 'Gateway Node', target: '192.168.1.1', icon: HiServer, est: '~2-4s', desc: 'Local Router' },
  { label: 'Home LAN Subnet', target: '192.168.1.0/24', icon: HiGlobeAlt, est: '~25-40s', desc: 'Local Network' },
  { label: 'Lab Subnet', target: '10.10.0.0/24', icon: HiSignal, est: '~25-40s', desc: 'Demo Environment' }
]


const SCAN_STAGES = [
  { label: 'Subnet Discovery', desc: 'Probing IP endpoints & resolving ARP MACs', duration: 8 },
  { label: 'Port Auditing', desc: 'Analyzing TCP open ports & banner grabbing', duration: 18 },
  { label: 'CIS IOS Engine', desc: 'Evaluating Cisco IOS 16 benchmark checks', duration: 28 },
  { label: 'Data Persistence', desc: 'Syncing assets & policies to storage engine', duration: 35 }
]


export default function ScanTriggerForm({ onClose, onScanComplete }) {
  const [target, setTarget] = useState('127.0.0.1')
  const [firewallProfile, setFirewallProfile] = useState('hardened')
  const [submitting, setSubmitting] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [validationError, setValidationError] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    let timer
    if (submitting) {
      setElapsedSeconds(0)
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [submitting])

  const targetDetails = getTargetDetails(target)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setValidationError(null)
    setApiError(null)

    const details = getTargetDetails(target)
    if (!details || !details.valid) {
      setValidationError(details?.error || 'Please enter a valid CIDR notation (/24 to /32) or comma-separated IPv4 list.')
      return
    }

    setSubmitting(true)
    try {
      const response = await client.post('/scan', {
        target: target.trim(),
        firewall_config_path: firewallProfile
      })
      setScanResult(response.data)
      onScanComplete?.(response.data)
    } catch (err) {
      setApiError(err.response?.data?.detail || err.message)
    } finally {
      setSubmitting(false)
    }
  }


  const isCidr24 = target.includes('/24')
  const estTotalTime = isCidr24 ? 35 : 6
  const progressPercent = Math.min(95, Math.round((elapsedSeconds / estTotalTime) * 90) + 5)

  const currentStageIndex = isCidr24
    ? elapsedSeconds < 8
      ? 0
      : elapsedSeconds < 18
      ? 1
      : elapsedSeconds < 28
      ? 2
      : 3
    : elapsedSeconds < 2
    ? 0
    : elapsedSeconds < 4
    ? 1
    : 2

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m > 0 ? `${m}m ` : ''}${s}s`
  }

  const devicesCount = scanResult?.devices?.length || 0
  const totalOpenPorts = scanResult?.devices?.reduce((acc, d) => acc + (d.open_ports?.length || 0), 0) || 0
  const cisPassed = scanResult?.summary?.passed ?? scanResult?.cis_results?.filter((c) => c.status === 'PASS').length ?? 0
  const cisTotal = scanResult?.summary?.total ?? scanResult?.cis_results?.length ?? 0
  const complianceScore = cisTotal > 0 ? Math.round((cisPassed / cisTotal) * 100) : 0

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="glass-card relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl my-auto">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm ${
              scanResult
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-indigo-50 border-indigo-100 text-indigo-600'
            }`}>
              {scanResult ? <HiCheckCircle className="h-6 w-6" /> : <HiBolt className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {scanResult ? 'Security Sweep Complete' : 'Initiate Security Sweep'}
              </h3>
              <p className="text-xs text-slate-500">
                {scanResult
                  ? scanResult.persistence?.status === 'synced'
                    ? `Audit finished and synced with ${scanResult.persistence.details || 'AWS DynamoDB'}`
                    : scanResult.persistence?.status === 'local'
                    ? `Audit finished and persisted to ${scanResult.persistence.details || 'Local SQLite Database'}`
                    : scanResult.persistence?.status === 'failed'
                    ? 'Audit completed (Persistence Warning: Storage sync failed)'
                    : 'Audit finished and recorded'
                  : 'Discover active nodes, audit ports, and evaluate CIS benchmarks'}
              </p>

            </div>
          </div>
          {!submitting && (
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <HiXMark className="h-5 w-5" />
            </button>
          )}
        </div>

        {scanResult ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-left">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <HiCheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  Sweep Finalized Across Target
                </span>
                <span className="mono text-[11px] text-emerald-700 font-semibold">
                  in {formatElapsed(elapsedSeconds)}
                </span>
              </div>
              <p className="mono text-xs font-bold text-slate-800">{target}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <HiComputerDesktop className="h-4 w-4 text-indigo-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Discovered Assets</span>
                </div>
                <div className="text-xl font-bold text-slate-900 mono">{devicesCount}</div>
                <span className="text-[10px] text-slate-400 font-medium">Active IP nodes</span>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <HiSignal className="h-4 w-4 text-amber-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Exposed Ports</span>
                </div>
                <div className="text-xl font-bold text-slate-900 mono">{totalOpenPorts}</div>
                <span className="text-[10px] text-slate-400 font-medium">Listening TCP services</span>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <HiShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">CIS Passed</span>
                </div>
                <div className="text-xl font-bold text-emerald-600 mono">{cisPassed} / {cisTotal}</div>
                <span className="text-[10px] text-slate-400 font-medium">Cisco IOS controls</span>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <HiBolt className="h-4 w-4 text-indigo-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Compliance</span>
                </div>
                <div className={`text-xl font-bold mono ${
                  complianceScore >= 90
                    ? 'text-emerald-600'
                    : complianceScore >= 70
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}>
                  {complianceScore}%
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Posture rating</span>
              </div>
            </div>


            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setScanResult(null)}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <HiArrowPath className="h-3.5 w-3.5" />
                <span>Run Another Scan</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-[0.98]"
              >
                <span>View Dashboard</span>
                <HiArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : submitting ? (
          <div className="py-4 text-center">
            <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20 opacity-75 duration-1000" />
              <div className="absolute inset-1 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 shadow-sm" />
              <FiRadio className="relative h-7 w-7 text-indigo-600 animate-pulse" />
            </div>

            <h4 className="text-base font-bold text-slate-900 tracking-tight">Sweeping Network Range</h4>
            <p className="mono text-xs text-indigo-600 font-semibold mt-0.5">{target}</p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-700">Estimated Scan Progress</span>
                <span className="mono font-bold text-indigo-600">{progressPercent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className="h-full bg-indigo-600 transition-all duration-1000 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 mono">
                <span className="flex items-center gap-1">
                  <HiClock className="h-3.5 w-3.5 text-slate-400" />
                  Elapsed: <strong className="text-slate-800 font-semibold">{formatElapsed(elapsedSeconds)}</strong>
                </span>
                <span>
                  Est. remaining: <strong className="text-slate-800 font-semibold">{Math.max(0, estTotalTime - elapsedSeconds)}s</strong>
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-left">
              {SCAN_STAGES.map((stage, idx) => {
                const isDone = idx < currentStageIndex
                const isCurrent = idx === currentStageIndex
                return (
                  <div
                    key={stage.label}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-xs transition-all ${
                      isCurrent
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-medium'
                        : isDone
                        ? 'bg-white border border-slate-100 text-slate-700'
                        : 'bg-slate-50/50 border border-transparent text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isDone ? (
                        <HiCheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : isCurrent ? (
                        <span className="flex h-4 w-4 items-center justify-center">
                          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                        </span>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-300 ml-1 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-semibold block truncate">{stage.label}</span>
                        <span className="text-[10px] text-slate-500 block truncate">{stage.desc}</span>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="mono text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md shrink-0">
                        Running...
                      </span>
                    )}
                    {isDone && (
                      <span className="mono text-[10px] font-bold text-emerald-700 shrink-0">
                        Done
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Target CIDR Subnet or IP List
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={target}
                  onChange={(event) => {
                    setTarget(event.target.value)
                    if (validationError) setValidationError(null)
                  }}
                  placeholder="e.g. 192.168.1.0/24 or 127.0.0.1"
                  className="mono w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                  autoFocus
                />
              </div>

              {targetDetails?.warning && (
                <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-900">
                  <HiExclamationTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-semibold block mb-0.5 text-amber-950">Subnet Scope Notice</strong>
                    {targetDetails.warning}
                  </div>
                </div>
              )}
            </div>


            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-700">
                  Public Cloud Targets (AWS Lambda Testing):
                </span>
                <span className="text-[10px] text-indigo-600 font-medium">Accessible Worldwide</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-3">
                {PUBLIC_PRESETS.map((preset) => {
                  const Icon = preset.icon
                  const isSelected = target === preset.target
                  return (
                    <button
                      key={preset.target}
                      type="button"
                      onClick={() => setTarget(preset.target)}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                          : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="h-4 w-4 shrink-0 text-indigo-600" />
                        <span className="truncate">{preset.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mono shrink-0 ml-1">{preset.target}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-500">
                  Local LAN Targets (Offline / Dev Mode):
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Local Machine & Wi-Fi</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {LOCAL_PRESETS.map((preset) => {
                  const Icon = preset.icon
                  const isSelected = target === preset.target
                  return (
                    <button
                      key={preset.target}
                      type="button"
                      onClick={() => setTarget(preset.target)}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-sm ring-1 ring-slate-200'
                          : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="truncate">{preset.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mono shrink-0 ml-1">{preset.target}</span>
                    </button>
                  )
                })}
              </div>
            </div>


            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                Cisco IOS Firewall Audit Profile:
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFirewallProfile('hardened')}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    firewallProfile === 'hardened'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <HiShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="truncate whitespace-nowrap">CIS Hardened</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                    Baseline: Hardened
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFirewallProfile('legacy')}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    firewallProfile === 'legacy'
                      ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <HiBolt className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="truncate whitespace-nowrap">Legacy Baseline</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                    Baseline: Legacy
                  </span>
                </button>

              </div>
            </div>

            {validationError && <ErrorBanner message={validationError} />}
            {apiError && <ErrorBanner message={apiError} />}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
              >
                <HiBolt className="h-4 w-4" />
                <span>Launch Scan</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}



