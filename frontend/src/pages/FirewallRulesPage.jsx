import { HiArrowPath } from 'react-icons/hi2'
import PageContainer from '../components/layout/PageContainer.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import ErrorBanner from '../components/common/ErrorBanner.jsx'
import FirewallRuleTable from '../components/firewall/FirewallRuleTable.jsx'
import useFirewallRules from '../hooks/useFirewallRules.js'

export default function FirewallRulesPage() {
  const { data, loading, error, refetch } = useFirewallRules()

  return (
    <PageContainer
      title="Firewall Access Control Policies"
      subtitle={`Parsed Cisco IOS ACL rules, SNMP definitions, and transport policies (${data.length} rules)`}
      action={
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all"
        >
          <HiArrowPath className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      {error && <ErrorBanner message={error} />}
      {loading ? <LoadingSpinner label="Parsing and loading firewall ACL rules..." /> : <FirewallRuleTable rules={data} />}
    </PageContainer>
  )
}


