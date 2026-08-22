import { useState, useMemo } from 'react'
import {
  HiMagnifyingGlass,
  HiFunnel,
  HiClipboardDocument,
  HiClipboardDocumentCheck,
  HiChevronRight,
  HiCpuChip,
  HiServer
} from 'react-icons/hi2'
import DeviceDetailDrawer from './DeviceDetailDrawer.jsx'

export default function DeviceTable({ devices }) {
  const [selected, setSelected] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPortFilter, setSelectedPortFilter] = useState('ALL')
  const [copiedIp, setCopiedIp] = useState(null)

  const handleCopy = (e, ip) => {
    e.stopPropagation()
    navigator.clipboard.writeText(ip)
    setCopiedIp(ip)
    setTimeout(() => setCopiedIp(null), 1800)
  }

  const availablePorts = useMemo(() => {
    const ports = new Set()
    devices.forEach((d) => (d.open_ports || []).forEach((p) => ports.add(p.port)))
    return Array.from(ports).sort((a, b) => a - b)
  }, [devices])

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        device.ip_address.toLowerCase().includes(q) ||
        (device.hostname && device.hostname.toLowerCase().includes(q)) ||
        (device.mac_address && device.mac_address.toLowerCase().includes(q)) ||
        (device.vendor && device.vendor.toLowerCase().includes(q))

      const matchesPort =
        selectedPortFilter === 'ALL' ||
        (device.open_ports || []).some((p) => String(p.port) === String(selectedPortFilter))

      return matchesSearch && matchesPort
    })
  }, [devices, searchQuery, selectedPortFilter])

  if (devices.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-4">
          <HiServer className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No Assets Discovered Yet</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Run a network sweep using the <strong>Run Scan</strong> button to discover active nodes, hostnames, and listening ports.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by IP, hostname, MAC or vendor..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1 shrink-0">
            <HiFunnel className="h-3.5 w-3.5" />
            <span>Port:</span>
          </span>
          <button
            onClick={() => setSelectedPortFilter('ALL')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold mono transition-colors shrink-0 ${
              selectedPortFilter === 'ALL'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({devices.length})
          </button>
          {availablePorts.map((port) => (
            <button
              key={port}
              onClick={() => setSelectedPortFilter(String(port))}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold mono transition-colors shrink-0 ${
                selectedPortFilter === String(port)
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              :{port}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <span className="font-semibold text-slate-900">{filteredDevices.length}</span> of{' '}
          <span className="font-semibold text-slate-900">{devices.length}</span> discovered assets
        </span>
        <span className="text-[11px] text-slate-400 italic">Click any row to inspect deep port banners</span>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">IP Address</th>
                <th className="px-5 py-3.5">Hostname</th>
                <th className="px-5 py-3.5">Hardware MAC / Vendor</th>
                <th className="px-5 py-3.5">Open Listening Ports</th>
                <th className="px-4 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDevices.map((device, index) => (
                <tr
                  key={`${device.device_id || device.ip_address}_${index}`}
                  onClick={() => setSelected(device)}
                  className="group cursor-pointer transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="mono font-bold text-slate-900 text-xs sm:text-sm">
                        {device.ip_address}
                      </span>
                      <button
                        onClick={(e) => handleCopy(e, device.ip_address)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
                        title="Copy IP"
                      >
                        {copiedIp === device.ip_address ? (
                          <HiClipboardDocumentCheck className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <HiClipboardDocument className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 text-xs text-slate-700">
                    {device.hostname ? (
                      <span className="font-semibold text-slate-800">{device.hostname}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-xs">
                    <div className="flex flex-col">
                      <span className="mono text-slate-700 text-[11px]">
                        {device.mac_address || <span className="text-slate-400">unknown</span>}
                      </span>
                      {device.vendor && (
                        <span className="text-[11px] text-indigo-600 font-semibold">
                          {device.vendor}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {(device.open_ports || []).map((port) => (
                        <span
                          key={port.port}
                          className="mono inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800"
                        >
                          <span className="text-indigo-600 font-bold">{port.port}</span>
                          <span className="text-slate-500 uppercase text-[10px]">{port.service}</span>
                        </span>
                      ))}
                      {(device.open_ports || []).length === 0 && (
                        <span className="text-xs text-slate-400 italic">none detected</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      <HiChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <DeviceDetailDrawer device={selected} onClose={() => setSelected(null)} />}
    </>
  )
}



