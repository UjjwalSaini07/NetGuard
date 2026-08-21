import { useState } from 'react'
import ScanTriggerForm from '../scan/ScanTriggerForm.jsx'

export default function Topbar({ lastScanTimestamp, onScanComplete }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="flex items-center justify-between border-b border-surface-border bg-surface-raised px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">NetGuard</h1>
        <p className="mono text-xs text-zinc-500">
          {lastScanTimestamp ? `Last scan: ${lastScanTimestamp}` : 'No scans run yet'}
        </p>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
      >
        Run Scan
      </button>
      {open && (
        <ScanTriggerForm
          onClose={() => setOpen(false)}
          onScanComplete={(result) => {
            setOpen(false)
            onScanComplete?.(result)
          }}
        />
      )}
    </header>
  )
}
