import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const apiKey = import.meta.env.VITE_API_KEY || 'netguard-secret-api-key-2026'

const client = axios.create({
  baseURL,
  headers: {
    'x-api-key': apiKey
  }
})

client.interceptors.request.use((config) => {
  config.headers['x-api-key'] = import.meta.env.VITE_API_KEY || apiKey
  return config
})

export default client
