import { useState } from 'react'
import DeviceDetailDrawer from './DeviceDetailDrawer.jsx'

export default function DeviceTable({ devices }) {
  const [selected, setSelected] = useState(null)

  if (devices.length === 0) {
    return <p className="text-sm text-zinc-500">No devices discovered yet. Run a scan to populate this table.</p>
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-raised text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">Hostname</th>
              <th className="px-4 py-3">MAC / Vendor</th>
              <th className="px-4 py-3">Open Ports</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {devices.map((device) => (
              <tr
                key={device.device_id}
                onClick={() => setSelected(device)}
                className="cursor-pointer hover:bg-surface-raised"
              >
                <td className="mono px-4 py-3 text-zinc-200">{device.ip_address}</td>
                <td className="px-4 py-3 text-zinc-400">{device.hostname || '—'}</td>
                <td className="mono px-4 py-3 text-zinc-400">
                  {device.mac_address || 'unknown'}
                  {device.vendor ? ` · ${device.vendor}` : ''}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(device.open_ports || []).map((port) => (
                      <span
                        key={port.port}
                        className="mono rounded bg-surface-raised px-1.5 py-0.5 text-xs text-zinc-300"
                      >
                        {port.port}/{port.service}
                      </span>
                    ))}
                    {(device.open_ports || []).length === 0 && <span className="text-xs text-zinc-600">none</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && <DeviceDetailDrawer device={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
