import { FiRadio } from 'react-icons/fi'

export default function LoadingSpinner({ label = 'Scanning network assets...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-slate-500">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20 opacity-75 duration-1000" />
        <div className="absolute inset-1 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 shadow-sm" />
        <FiRadio className="relative h-6 w-6 text-indigo-600 animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mono text-xs text-slate-400 mt-0.5">Auditing CIS compliance and active ports</p>
      </div>
    </div>
  )
}


