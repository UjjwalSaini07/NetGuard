import axios from 'axios'

export const DEFAULT_CLOUD_API_URL = 'https://zrr4hr2xd2.execute-api.us-east-1.amazonaws.com'
export const DEFAULT_LOCAL_API_URL = 'http://localhost:8000'

export function isPrivateHost(hostname) {
  if (!hostname) return false
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  if (hostname.startsWith('192.168.')) return true
  if (hostname.startsWith('10.')) return true
  const match = hostname.match(/^172\.(\d{1,3})\./)
  if (match) {
    const octet = parseInt(match[1], 10)
    if (octet >= 16 && octet <= 31) return true
  }
  return false
}

export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('netguard_api_base_url')
    if (stored && stored.trim()) {
      return stored.trim()
    }
    const host = window.location.hostname
    if (!isPrivateHost(host)) {
      return DEFAULT_CLOUD_API_URL
    }
  }
  return DEFAULT_LOCAL_API_URL
}


export function getApiKey() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('netguard_api_key') || sessionStorage.getItem('netguard_api_key')
    if (stored && stored.trim()) {
      return stored.trim()
    }
  }
  return ''
}

export function setApiConfig({ baseUrl, apiKey }) {
  if (typeof window !== 'undefined') {
    if (baseUrl !== undefined) {
      if (baseUrl) {
        localStorage.setItem('netguard_api_base_url', baseUrl.trim())
      } else {
        localStorage.removeItem('netguard_api_base_url')
      }
    }
    if (apiKey !== undefined) {
      if (apiKey) {
        localStorage.setItem('netguard_api_key', apiKey.trim())
      } else {
        localStorage.removeItem('netguard_api_key')
        sessionStorage.removeItem('netguard_api_key')
      }
    }
  }
}

export function clearApiConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('netguard_api_base_url')
    localStorage.removeItem('netguard_api_key')
    sessionStorage.removeItem('netguard_api_key')
  }
}

const client = axios.create({
  timeout: 200000
})



client.interceptors.request.use((config) => {
  const currentBaseUrl = getApiBaseUrl()
  const currentApiKey = getApiKey()

  config.baseURL = currentBaseUrl

  if (currentApiKey) {
    config.headers['x-api-key'] = currentApiKey
  } else {
    delete config.headers['x-api-key']
  }

  return config
})

export default client



