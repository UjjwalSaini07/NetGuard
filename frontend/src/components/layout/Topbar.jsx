import { useState } from 'react'
import { HiBars3, HiBolt, HiClock, HiServer } from 'react-icons/hi2'
import ScanTriggerForm from '../scan/ScanTriggerForm.jsx'
import useHealthCheck from '../../hooks/useHealthCheck.js'

export default function Topbar({ lastScanTimestamp, onScanComplete, onToggleMobile = () => {} }) {
  const [open, setOpen] = useState(false)
  const { isOnline, latency, checking } = useHealthCheck()
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  const formatTimestamp = (ts) => {
    if (!ts) return 'No scan executed yet'
    try {
      const date = new Date(ts)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (' + date.toLocaleDateString() + ')'
    } catch {
      return String(ts)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur-md md:px-8 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 md:hidden"
        >
          <HiBars3 className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 md:text-lg">Network Security Posture</h1>
            {checking ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
                Connecting...
              </span>
            ) : isOnline ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </span>
            ) : (
              <span className="hidden items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Offline
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
            <HiClock className="h-3.5 w-3.5 text-slate-400" />
            <span className="mono text-[11px] text-slate-500">
              Last audit: <span className="text-slate-800 font-medium">{formatTimestamp(lastScanTimestamp)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-600 font-mono lg:flex">
          <HiServer className="h-4 w-4 text-slate-400" />
          <span>
            Host: <span className="text-slate-800 font-medium" title={apiBaseUrl}>{apiBaseUrl}</span>{' '}
            {isOnline ? (
              <span className="text-emerald-700 font-semibold">({latency ? `${latency}ms` : 'Active'})</span>
            ) : checking ? (
              <span className="text-slate-400 font-semibold">(Probing...)</span>
            ) : (
              <span className="text-rose-600 font-semibold">(Offline)</span>
            )}
          </span>
        </div>


        <button
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-[0.98] sm:px-5 sm:text-sm"
        >
          <HiBolt className="h-4 w-4" />
          <span>Run Scan</span>
        </button>
      </div>

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




