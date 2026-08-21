import { useState } from 'react'
import client from '../../api/client.js'
import ErrorBanner from '../common/ErrorBanner.jsx'

const TARGET_PATTERN = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?(\s*,\s*(\d{1,3}\.){3}\d{1,3})*$/

export default function ScanTriggerForm({ onClose, onScanComplete }) {
  const [target, setTarget] = useState('10.10.0.0/24')
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState(null)
  const [apiError, setApiError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setValidationError(null)
    setApiError(null)

    if (!TARGET_PATTERN.test(target.trim())) {
      setValidationError('Enter a CIDR subnet (e.g. 10.10.0.0/24) or comma-separated IPs.')
      return
    }

    setSubmitting(true)
    try {
      const response = await client.post('/scan', { target: target.trim() })
      onScanComplete?.(response.data)
    } catch (err) {
      setApiError(err.response?.data?.detail || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-lg border border-surface-border bg-surface-raised p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">Run a Scan</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Target</label>
            <input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="10.10.0.0/24"
              className="mono w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </div>
          {validationError && <ErrorBanner message={validationError} />}
          {apiError && <ErrorBanner message={apiError} />}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              {submitting ? 'Scanning…' : 'Start Scan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
