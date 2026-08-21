import PageContainer from '../components/layout/PageContainer.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import ErrorBanner from '../components/common/ErrorBanner.jsx'
import FirewallRuleTable from '../components/firewall/FirewallRuleTable.jsx'
import useFirewallRules from '../hooks/useFirewallRules.js'

export default function FirewallRulesPage() {
  const { data, loading, error } = useFirewallRules()

  return (
    <PageContainer title="Firewall Rules">
      {error && <ErrorBanner message={error} />}
      {loading ? <LoadingSpinner /> : <FirewallRuleTable rules={data} />}
    </PageContainer>
  )
}
