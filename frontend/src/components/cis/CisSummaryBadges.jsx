import { HiShieldCheck, HiShieldExclamation, HiDocumentCheck, HiTrophy } from 'react-icons/hi2'

export default function CisSummaryBadges({ summary }) {
  const total = summary.total || 0
  const passed = summary.passed || 0
  const failed = summary.failed || 0
  const score = total > 0 ? Math.round((passed / total) * 100) : 0

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div className="glass-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Compliance Score
          </span>
          <div className="mt-1 text-3xl font-extrabold text-slate-900">{score}%</div>
        </div>
        <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
          {passed}/{total}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Audits
          </span>
          <div className="mt-1 text-3xl font-extrabold text-slate-900">{total}</div>
        </div>
        <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
          <HiDocumentCheck className="h-5 w-5" />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Passed Rules
          </span>
          <div className="mt-1 text-3xl font-extrabold text-emerald-600">{passed}</div>
        </div>
        <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
          <HiShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Failed Violations
          </span>
          <div className="mt-1 text-3xl font-extrabold text-rose-600">{failed}</div>
        </div>
        <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
          <HiShieldExclamation className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
