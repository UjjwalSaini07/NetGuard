import { useState } from 'react'
import {
  HiXMark,
  HiClipboardDocument,
  HiClipboardDocumentCheck,
  HiServer,
  HiCpuChip,
  HiKey,
  HiShieldExclamation,
  HiCommandLine
} from 'react-icons/hi2'

export default function DeviceDetailDrawer({ device, onClose }) {
  const [copiedField, setCopiedField] = useState(null)

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <div className="h-full w-full max-w-full sm:max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-4 sm:p-6 shadow-2xl animate-in slide-in-from-right duration-200">

        <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
              <HiServer className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="mono text-lg font-bold text-slate-900">{device.ip_address}</h3>
                <button
                  onClick={() => copyToClipboard(device.ip_address, 'ip')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="Copy IP"
                >
                  {copiedField === 'ip' ? (
                    <HiClipboardDocumentCheck className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <HiClipboardDocument className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500">{device.hostname || 'Unresolved Hostname'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              Hardware & Network Profile
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <span className="text-[11px] text-slate-400 block mb-1 font-medium">Physical MAC</span>
                <div className="flex items-center justify-between">
                  <span className="mono text-xs font-semibold text-slate-800 truncate">
                    {device.mac_address || 'unknown'}
                  </span>
                  {device.mac_address && (
                    <button
                      onClick={() => copyToClipboard(device.mac_address, 'mac')}
                      className="text-slate-400 hover:text-slate-600 ml-2"
                    >
                      {copiedField === 'mac' ? (
                        <HiClipboardDocumentCheck className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <HiClipboardDocument className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <span className="text-[11px] text-slate-400 block mb-1 font-medium">Hardware Vendor</span>
                <span className="text-xs font-semibold text-slate-800 block truncate">
                  {device.vendor || 'Unknown Vendor'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Listening Ports & Services ({device.open_ports?.length || 0})
              </h4>
              <span className="text-[10px] text-slate-400 mono">Port Scan Telemetry</span>
            </div>

            <div className="space-y-3">
              {(device.open_ports || []).map((port) => (
                <div
                  key={port.port}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:border-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="mono text-sm font-bold text-slate-900">
                        Port {port.port}
                      </span>
                      <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-semibold uppercase mono text-indigo-700">
                        {port.service}
                      </span>
                    </div>
                  </div>

                  {port.banner ? (
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                        <HiCommandLine className="h-3.5 w-3.5 text-slate-400" />
                        <span>Service Banner Response:</span>
                      </div>
                      <pre className="mono overflow-x-auto rounded-lg bg-slate-900 p-2.5 text-xs text-emerald-400 border border-slate-800">
                        {port.banner}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-2 italic">
                      Standard service listener without banner response
                    </p>
                  )}
                </div>
              ))}

              {(device.open_ports || []).length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                  No open ports discovered in standard scan list.
                </div>
              )}
            </div>
          </div>

          {device.discovered_at && (
            <div className="border-t border-slate-100 pt-4 text-xs text-slate-400 mono">
              Discovered: {new Date(device.discovered_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



