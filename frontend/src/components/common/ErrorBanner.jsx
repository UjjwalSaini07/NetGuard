import { HiExclamationTriangle } from 'react-icons/hi2'

export default function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-2.5 text-xs text-rose-800 shadow-sm">
      <HiExclamationTriangle className="h-4 w-4 shrink-0 text-rose-500" />
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-bold text-rose-900">System Alert:</span>
        <span className="font-mono text-rose-700 font-medium">{String(message)}</span>
      </div>
    </div>
  )
}



