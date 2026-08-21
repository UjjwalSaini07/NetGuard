import { useCallback, useEffect, useState } from 'react'
import client from '../api/client.js'

export default function useDevices() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    client
      .get('/devices')
      .then((response) => setData(response.data.items || []))
      .catch((err) => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
