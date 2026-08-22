import { Link } from 'react-router-dom'
import {
  HiServerStack,
  HiShieldCheck,
  HiShieldExclamation,
  HiKey,
  HiArrowRight,
  HiExclamationCircle,
  HiCheckCircle,
  HiCpuChip,
  HiSignal
} from 'react-icons/hi2'
import { RiShieldFlashFill } from 'react-icons/ri'
import PageContainer from '../components/layout/PageContainer.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import ErrorBanner from '../components/common/ErrorBanner.jsx'
import StatusPill from '../components/common/StatusPill.jsx'
import useDevices from '../hooks/useDevices.js'
import useCisResults from '../hooks/useCisResults.js'

export default function DashboardPage() {
  const { data: devices, loading: devicesLoading, error: devicesError } = useDevices()
  const { data: cisResults, summary, loading: cisLoading, error: cisError } = useCisResults()

  const openPortsCount = devices.reduce((total, device) => total + (device.open_ports?.length || 0), 0)

  const totalChecks = summary.total || cisResults.length || 0
  const passedChecks = summary.passed || 0
  const complianceScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0

  const sensitivePorts = [21, 22, 23, 80, 445, 3306, 3389, 5432]
  const exposedSensitivePorts = devices.flatMap((d) =>
    (d.open_ports || []).filter((p) => sensitivePorts.includes(p.port)).map((p) => ({ ...p, ip: d.ip_address, host: d.hostname }))
  )

  if (devicesLoading || cisLoading) {
    return (
      <PageContainer title="Security Dashboard" subtitle="Real-time network security posture analysis">
        <LoadingSpinner label="Loading telemetry & compliance status..." />
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Security Posture Overview"
      subtitle="Discovered infrastructure endpoints, port exposure analysis, and CIS Cisco IOS compliance"
    >
      {(devicesError || cisError) && <ErrorBanner message={devicesError || cisError} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="glass-card glass-card-hover relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 lg:col-span-1 border border-slate-200 bg-white shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Compliance Health
              </span>
              <span className="rounded-md bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 mono">
                CIS Cisco IOS
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {complianceScore}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {totalChecks === 0 ? (
                    <span className="text-slate-500 font-semibold flex items-center gap-1">
                      <HiShieldCheck className="h-4 w-4 inline text-slate-400" /> Pending Audit
                    </span>
                  ) : complianceScore === 100 ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <HiCheckCircle className="h-4 w-4 inline text-emerald-600" /> Fully Hardened
                    </span>
                  ) : complianceScore >= 90 ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <HiCheckCircle className="h-4 w-4 inline text-emerald-600" /> Strong / Minor Gaps
                    </span>
                  ) : complianceScore >= 70 ? (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <HiExclamationCircle className="h-4 w-4 inline text-amber-500" /> Action Needed
                    </span>
                  ) : (
                    <span className="text-rose-700 font-semibold flex items-center gap-1">
                      <HiShieldExclamation className="h-4 w-4 inline text-rose-500" /> Critical Exposure
                    </span>
                  )}
                </p>
              </div>

              <div className="flex-1 max-w-[140px]">
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      totalChecks === 0
                        ? 'bg-slate-200'
                        : complianceScore >= 90
                        ? 'bg-emerald-500'
                        : complianceScore >= 70
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${totalChecks === 0 ? 0 : Math.max(5, complianceScore)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 font-medium mono">
                  <span className="text-emerald-600">{passedChecks} Pass</span>
                  <span className="text-rose-600">{summary.failed || (totalChecks - passedChecks)} Fail</span>
                </div>
              </div>
            </div>
          </div>



          <div className="mt-6 border-t border-slate-100 pt-4">
            <Link
              to="/cis-results"
              className="group flex items-center justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <span>Inspect All Benchmark Rules</span>
              <HiArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2 sm:grid-cols-2">
          <StatCard
            label="Discovered Assets"
            value={devices.length}
            sub="Active IP endpoints"
            icon={HiServerStack}
            accent="indigo"
            linkTo="/devices"
          />
          <StatCard
            label="Exposed Ports"
            value={openPortsCount}
            sub="Active listening services"
            icon={HiKey}
            accent="sky"
            linkTo="/devices"
          />
          <StatCard
            label="CIS Passed"
            value={passedChecks}
            sub="Compliant benchmark controls"
            icon={HiShieldCheck}
            accent="emerald"
            linkTo="/cis-results"
          />
          <StatCard
            label="Security Violations"
            value={summary.failed || 0}
            sub="Critical hardening gaps"
            icon={HiShieldExclamation}
            accent="rose"
            linkTo="/cis-results"
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <HiCpuChip className="h-4 w-4" />
                </div>
                <span>Exposed Services & Attack Surface</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Known sensitive services detected on the network</p>
            </div>
            <Link
              to="/devices"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              View all ({devices.length})
            </Link>
          </div>

          <div className="space-y-2.5">
            {exposedSensitivePorts.length > 0 ? (
              exposedSensitivePorts.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="mono text-xs font-bold text-slate-900">{item.ip}</span>
                    {item.host && <span className="text-xs text-slate-500">({item.host})</span>}
                  </div>
                  <span className="mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-amber-800 shadow-sm">
                    {item.port}/{item.service}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                No high-risk sensitive ports detected on active devices.
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <RiShieldFlashFill className="h-4 w-4" />
                </div>
                <span>CIS Benchmark Audit Status</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Top automated Cisco IOS benchmark checks</p>
            </div>
            <Link
              to="/cis-results"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              All checks ({cisResults.length})
            </Link>
          </div>

          <div className="space-y-2.5">
            {cisResults.slice(0, 5).map((result, idx) => (
              <div
                key={`${result.scan_id || ''}_${result.check_id}_${idx}`}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 transition-colors hover:bg-slate-50 hover:border-slate-300"
              >
                <div className="flex flex-col pr-4 min-w-0">
                  <span className="text-xs font-semibold text-slate-900 truncate">{result.title}</span>
                  <span className="mono text-[11px] text-slate-400 mt-0.5">{result.cis_reference}</span>
                </div>
                <StatusPill status={result.status} />
              </div>
            ))}
            {cisResults.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                No CIS results recorded yet. Click <strong>Run Scan</strong> to audit your network.
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

function StatCard({ label, value, sub, icon: Icon, accent, linkTo }) {
  const accentClasses = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    sky: 'text-sky-600 bg-sky-50 border-sky-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    rose: 'text-rose-600 bg-rose-50 border-rose-100'
  }[accent] || 'text-slate-600 bg-slate-50 border-slate-100'

  return (
    <Link
      to={linkTo || '#'}
      className="glass-card glass-card-hover group relative flex flex-col justify-between rounded-2xl p-5 border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
          {label}
        </span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${accentClasses} transition-transform group-hover:scale-105`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</div>
        <p className="text-[11px] text-slate-400 mt-1 font-medium">{sub}</p>
      </div>
    </Link>
  )
}
