export default function DeviceDetailDrawer({ device, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-surface-border bg-surface-raised p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="mono text-lg font-semibold text-zinc-100">{device.ip_address}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            ✕
          </button>
        </div>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-zinc-500">Hostname</dt>
            <dd className="text-zinc-200">{device.hostname || 'unknown'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">MAC Address</dt>
            <dd className="mono text-zinc-200">{device.mac_address || 'unknown'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Vendor</dt>
            <dd className="text-zinc-200">{device.vendor || 'unknown'}</dd>
          </div>
          <div>
            <dt className="mb-2 text-zinc-500">Open Ports &amp; Services</dt>
            <dd className="space-y-2">
              {(device.open_ports || []).map((port) => (
                <div key={port.port} className="rounded-md border border-surface-border p-3">
                  <div className="mono text-zinc-200">
                    {port.port} / {port.service}
                  </div>
                  {port.banner && <div className="mono mt-1 truncate text-xs text-zinc-500">{port.banner}</div>}
                </div>
              ))}
              {(device.open_ports || []).length === 0 && <span className="text-xs text-zinc-600">No open ports detected</span>}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
