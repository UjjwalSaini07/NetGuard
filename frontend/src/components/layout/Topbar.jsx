import { useState } from 'react'
import { HiBars3, HiBolt, HiClock, HiServer, HiKey } from 'react-icons/hi2'
import ScanTriggerForm from '../scan/ScanTriggerForm.jsx'
import ApiConfigModal from '../common/ApiConfigModal.jsx'
import useHealthCheck from '../../hooks/useHealthCheck.js'
import { useScanData } from '../../context/ScanDataContext.jsx'
import { getApiBaseUrl, getApiKey } from '../../api/client.js'

export default function Topbar({ lastScanTimestamp, onScanComplete, onToggleMobile = () => {} }) {
  const [open, setOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const { isOnline, latency, checking, refetch: refetchHealth } = useHealthCheck()
  const { refetchAll } = useScanData()

  const currentBaseUrl = getApiBaseUrl()
  const currentApiKey = getApiKey()
  const hasApiKey = Boolean(currentApiKey && currentApiKey.trim())

  const formatTimestamp = (ts) => {
    if (!ts) return { time: 'No scan yet', date: '' }
    try {
      const date = new Date(ts)
      return {
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: `(${date.toLocaleDateString()})`
      }
    } catch {
      return { time: String(ts), date: '' }
    }
  }

  const tsInfo = formatTimestamp(lastScanTimestamp)

  const handleConfigSaved = () => {
    refetchHealth?.()
    refetchAll?.()
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3.5 py-2.5 sm:px-4 sm:py-3.5 backdrop-blur-md md:px-8 shadow-sm">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={onToggleMobile}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 md:hidden"
        >
          <HiBars3 className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 truncate tracking-tight">
              Network Security Posture
            </h1>
            {checking ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 sm:inline-flex shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
                Connecting...
              </span>
            ) : isOnline ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 sm:inline-flex shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </span>
            ) : (
              <span className="hidden items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 sm:inline-flex shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Offline
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-slate-500 mt-0.5 min-w-0">
            <HiClock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="mono text-[10px] sm:text-[11px] text-slate-500 truncate whitespace-nowrap">
              Last audit: <span className="text-slate-800 font-medium">{tsInfo.time}</span>
              {tsInfo.date && <span className="hidden sm:inline ml-1 font-normal text-slate-500">{tsInfo.date}</span>}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={() => setConfigOpen(true)}
          className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-600 font-mono lg:flex hover:bg-slate-100 hover:border-slate-300 transition-colors"
          title="Click to configure Backend URL & API Key"
        >
          <HiServer className="h-4 w-4 text-slate-400" />
          <span className="max-w-[170px] truncate" title={currentBaseUrl}>{currentBaseUrl}</span>
          <span className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200">
            <HiKey className={`h-3.5 w-3.5 ${hasApiKey ? 'text-emerald-600' : 'text-amber-500 animate-pulse'}`} />
            <span className={hasApiKey ? 'text-slate-700 font-semibold' : 'text-amber-700 font-bold'}>
              {hasApiKey ? 'Key Set' : 'Set Key'}
            </span>
          </span>
        </button>

        <button
          onClick={() => setConfigOpen(true)}
          className={`flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-semibold transition-all lg:hidden ${
            hasApiKey
              ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 animate-pulse'
          }`}
          title="Configure API Key and Backend Connection"
        >
          <HiKey className={`h-4 w-4 ${hasApiKey ? 'text-emerald-600' : 'text-amber-600'}`} />
          <span className="hidden sm:inline">{hasApiKey ? 'Key Set' : 'Set Key'}</span>
        </button>

        <button
          onClick={() => setOpen(true)}
          className="flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 rounded-xl bg-indigo-600 px-3.5 sm:px-5 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-[0.98] sm:text-sm shrink-0 whitespace-nowrap"
        >
          <HiBolt className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Run Scan</span>
        </button>
      </div>

      {configOpen && (
        <ApiConfigModal
          onClose={() => setConfigOpen(false)}
          onConfigSaved={handleConfigSaved}
        />
      )}

      {open && (
        <ScanTriggerForm
          onClose={() => setOpen(false)}
          onScanComplete={(result) => {
            onScanComplete?.(result)
          }}
        />
      )}
    </header>
  )
}





