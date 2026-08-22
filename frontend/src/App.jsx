import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar.jsx'
import Topbar from './components/layout/Topbar.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import DevicesPage from './pages/DevicesPage.jsx'
import FirewallRulesPage from './pages/FirewallRulesPage.jsx'
import CisResultsPage from './pages/CisResultsPage.jsx'
import { ScanDataProvider, useScanData } from './context/ScanDataContext.jsx'

function MainLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { lastScanTimestamp, applyScanResult } = useScanData()

  return (
    <div className="flex min-h-screen bg-white text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <Topbar
          lastScanTimestamp={lastScanTimestamp}
          onScanComplete={applyScanResult}
          onToggleMobile={() => setMobileNavOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto">
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

export default function App() {
  return (
    <ScanDataProvider>
      <MainLayout />
    </ScanDataProvider>
  )
}


