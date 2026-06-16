import { useState, useEffect } from 'react'
import earthquakeData from '@/data/earthquakes.json'

export interface Earthquake {
  longitude: number
  latitude: number
  magnitude: number
  depth: number
  timestamp: number
  region: string
}

export function useEarthquakeData() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 100))
        const data = earthquakeData as Earthquake[]
        const sortedData = [...data].sort((a, b) => b.timestamp - a.timestamp)
        setEarthquakes(sortedData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return { earthquakes, loading, error }
}
