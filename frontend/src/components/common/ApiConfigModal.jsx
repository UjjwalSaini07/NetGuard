import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  HiXMark,
  HiKey,
  HiServer,
  HiEye,
  HiEyeSlash,
  HiCheckCircle,
  HiExclamationCircle,
  HiCloud,
  HiComputerDesktop,
  HiArrowPath
} from 'react-icons/hi2'
import axios from 'axios'
import {
  getApiBaseUrl,
  getApiKey,
  setApiConfig,
  clearApiConfig,
  DEFAULT_CLOUD_API_URL,
  DEFAULT_LOCAL_API_URL
} from '../../api/client.js'

export default function ApiConfigModal({ onClose, onConfigSaved = () => {} }) {
  const [baseUrl, setBaseUrl] = useState(getApiBaseUrl())
  const [apiKey, setApiKey] = useState(getApiKey())
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleTestAndSave = async (e) => {
    e.preventDefault()
    setTesting(true)
    setTestResult(null)

    const cleanUrl = (baseUrl || '').trim().replace(/\/+$/, '')
    const cleanKey = (apiKey || '').trim()

    try {
      const healthRes = await axios.get(`${cleanUrl}/health`, { timeout: 8000 })
      const isHealthOk = healthRes.status === 200 && healthRes.data?.status !== 'error'

      let authOk = true
      let authMessage = ''

      if (cleanKey) {
        try {
          const authRes = await axios.get(`${cleanUrl}/devices`, {
            headers: { 'x-api-key': cleanKey },
            timeout: 8000
          })
          authOk = authRes.status === 200
        } catch (err) {
          if (err.response?.status === 401 || err.response?.status === 403) {
            authOk = false
            authMessage = 'The API Key was rejected by the server (Invalid API Key).'
          }
        }
      }

      setApiConfig({ baseUrl: cleanUrl, apiKey: cleanKey })

      if (isHealthOk && authOk) {
        setTestResult({
          type: 'success',
          message: `Connected successfully! Runtime: ${healthRes.data?.runtime_mode || 'online'}${cleanKey ? ' (Authenticated)' : ' (No API Key set)'}`
        })
        setTimeout(() => {
          onConfigSaved()
          onClose()
        }, 1200)
      } else if (!authOk) {
        setTestResult({
          type: 'error',
          message: authMessage || 'Backend reachable, but API Key verification failed.'
        })
        onConfigSaved()
      } else {
        setTestResult({
          type: 'warning',
          message: 'Backend reached, but reported a degraded health state.'
        })
        onConfigSaved()
      }
    } catch (err) {
      setApiConfig({ baseUrl: cleanUrl, apiKey: cleanKey })
      setTestResult({
        type: 'error',
        message: `Could not reach ${cleanUrl}. Network error or CORS restriction.`
      })
      onConfigSaved()
    } finally {
      setTesting(false)
    }
  }

  const handleClear = () => {
    clearApiConfig()
    setBaseUrl(getApiBaseUrl())
    setApiKey('')
    setTestResult({
      type: 'info',
      message: 'Connection configuration reset to defaults.'
    })
    onConfigSaved()
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="glass-card relative w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl my-auto">
        <div className="mb-4 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm shrink-0">
              <HiKey className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Backend & API Key Settings
              </h3>
              <p className="text-xs text-slate-500">
                Configure your API key and backend connection endpoint securely
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleTestAndSave} className="space-y-4 overflow-y-auto pr-1 flex-1">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Backend Endpoint URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://..."
                className="mono w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
              />
            </div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBaseUrl(DEFAULT_CLOUD_API_URL)}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  baseUrl === DEFAULT_CLOUD_API_URL
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <HiCloud className="h-4 w-4 shrink-0 text-indigo-600" />
                  <span className="truncate">AWS Cloud API</span>
                </div>
                <span className="text-[10px] text-indigo-600 mono shrink-0">Live</span>
              </button>

              <button
                type="button"
                onClick={() => setBaseUrl(DEFAULT_LOCAL_API_URL)}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  baseUrl === DEFAULT_LOCAL_API_URL
                    ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-sm ring-1 ring-slate-200'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <HiComputerDesktop className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="truncate">Local Dev Server</span>
                </div>
                <span className="text-[10px] text-slate-400 mono shrink-0">:8000</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Security API Key (<span className="mono lowercase">x-api-key</span>)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Stored in Browser Session</span>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your NETGUARD_API_KEY..."
                className="mono w-full rounded-xl border border-slate-200 bg-white pl-4 pr-10 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <HiEyeSlash className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Your API key is saved locally in your browser storage. It is never bundled into public static files.
            </p>
          </div>

          {testResult && (
            <div className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
              testResult.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : testResult.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}>
              {testResult.type === 'success' ? (
                <HiCheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <HiExclamationCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed font-medium">
                {testResult.message}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors text-center"
            >
              Reset Defaults
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors flex-1 sm:flex-initial text-center"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={testing}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 flex-1 sm:flex-initial whitespace-nowrap"
              >
                {testing ? (
                  <>
                    <HiArrowPath className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Save & Connect</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
