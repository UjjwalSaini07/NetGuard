import { HiCheckCircle, HiXCircle, HiInformationCircle } from 'react-icons/hi2'

export default function StatusPill({ status, showIcon = true }) {
  const isPass = status === 'PASS' || status === 'permit'
  const isFail = status === 'FAIL' || status === 'deny'

  let styles = 'bg-slate-100 text-slate-700 border-slate-200'
  let Icon = HiInformationCircle

  if (isPass) {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
    Icon = HiCheckCircle
  } else if (isFail) {
    styles = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
    Icon = HiXCircle
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs mono tracking-wide ${styles}`}>
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span>{status}</span>
    </span>
  )
}


