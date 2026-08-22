import { NavLink } from 'react-router-dom'
import {
  HiSquares2X2,
  HiCpuChip,
  HiShieldCheck,
  HiDocumentCheck,
  HiCloud
} from 'react-icons/hi2'
import useHealthCheck from '../../hooks/useHealthCheck.js'

const links = [
  { to: '/', label: 'Overview & Health', icon: HiSquares2X2, desc: 'Posture & metrics' },
  { to: '/devices', label: 'Network Assets', icon: HiCpuChip, desc: 'Hardware & ports' },
  { to: '/firewall-rules', label: 'Firewall Policies', icon: HiShieldCheck, desc: 'Cisco ACL rules' },
  { to: '/cis-results', label: 'CIS Audits', icon: HiDocumentCheck, desc: 'Compliance checks' }
]

export default function Sidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  const { isOnline, dynamodb, runtimeMode, awsRegion, checking } = useHealthCheck()
  const isDbReady = isOnline && dynamodb === 'ok'


  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-slate-200/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/netguard-logo.png"
              alt="NetGuard Logo"
              className="h-10 w-10 rounded-xl object-contain shadow-sm"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900">NetGuard</span>
                <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/70">
                  v1.0.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Posture & CIS Auditing</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3.5 py-5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Navigation
          </p>
          {links.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/80 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${
                        isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <div className="flex flex-col">
                      <span>{link.label}</span>
                      <span className={`text-[10px] ${isActive ? 'text-indigo-500 font-normal' : 'text-slate-400 font-normal'}`}>
                        {link.desc}
                      </span>
                    </div>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <HiCloud className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-800">AWS DynamoDB</span>
              </div>
              {checking ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                  Connecting
                </span>
              ) : isDbReady ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Offline
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 mono">
              <span>{runtimeMode === 'lambda' ? `Region: ${awsRegion || 'us-east-1'}` : `Region: ${awsRegion || 'us-east-1'} (Local)`}</span>
              <span className={isDbReady ? 'text-slate-700 font-semibold' : 'text-rose-600 font-semibold'}>
                {checking ? 'Probing...' : isDbReady ? 'Ready' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>


      </aside>
    </>
  )
}




