import { HiExclamationTriangle } from 'react-icons/hi2'

export default function ErrorBanner({ message }) {
  if (!message) return null

  const formatMessage = (msg) => {
    if (!msg) return ''
    if (typeof msg === 'string') return msg
    if (Array.isArray(msg)) {
      return msg
        .map((item) => (typeof item === 'object' ? item.msg || item.message || item.error || JSON.stringify(item) : String(item)))
        .join(' | ')
    }
    if (typeof msg === 'object') {
      if (msg.error) return typeof msg.error === 'object' ? JSON.stringify(msg.error) : String(msg.error)
      if (msg.detail) return typeof msg.detail === 'object' ? JSON.stringify(msg.detail) : String(msg.detail)
      if (msg.message) return String(msg.message)
      if (msg.msg) return String(msg.msg)
      try {
        return JSON.stringify(msg)
      } catch {
        return 'An error occurred'
      }
    }
    return String(msg)
  }

  return (
    <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-2.5 text-xs text-rose-800 shadow-sm">
      <HiExclamationTriangle className="h-4 w-4 shrink-0 text-rose-500" />
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-bold text-rose-900">System Alert:</span>
        <span className="font-mono text-rose-700 font-medium">{formatMessage(message)}</span>
      </div>
    </div>
  )
}




