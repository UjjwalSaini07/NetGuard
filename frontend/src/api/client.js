import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const apiKey = import.meta.env.VITE_API_KEY

if (!apiKey) {
  console.error('CRITICAL: VITE_API_KEY is not set in environment. Please configure VITE_API_KEY in your .env file.')
}

const client = axios.create({
  baseURL,
  headers: {
    'x-api-key': apiKey || ''
  }
})

client.interceptors.request.use((config) => {
  const currentKey = import.meta.env.VITE_API_KEY
  if (!currentKey) {
    throw new Error('VITE_API_KEY environment variable is missing. Configure VITE_API_KEY in .env.')
  }
  config.headers['x-api-key'] = currentKey
  return config
})

export default client

