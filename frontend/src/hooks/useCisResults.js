import { useCallback, useEffect, useState } from 'react'
import client from '../api/client.js'

export default function useCisResults() {
  const [data, setData] = useState([])
  const [summary, setSummary] = useState({ total: 0, passed: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    client
      .get('/cis-results')
      .then((response) => {
        setData(response.data.items || [])
        setSummary(response.data.summary || { total: 0, passed: 0, failed: 0 })
      })
      .catch((err) => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, summary, loading, error, refetch }
}
