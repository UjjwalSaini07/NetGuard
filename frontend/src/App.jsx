import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar.jsx'
import Topbar from './components/layout/Topbar.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import DevicesPage from './pages/DevicesPage.jsx'
import FirewallRulesPage from './pages/FirewallRulesPage.jsx'
import CisResultsPage from './pages/CisResultsPage.jsx'

export default function App() {
  const [lastScanTimestamp, setLastScanTimestamp] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleScanComplete = (result) => {
    setLastScanTimestamp(result.timestamp)
    setRefreshKey((key) => key + 1)
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex-1">
        <Topbar lastScanTimestamp={lastScanTimestamp} onScanComplete={handleScanComplete} />
        <main key={refreshKey}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/firewall-rules" element={<FirewallRulesPage />} />
            <Route path="/cis-results" element={<CisResultsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
