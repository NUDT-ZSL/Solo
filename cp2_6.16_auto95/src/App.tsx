import { useState, useEffect, useCallback, useMemo } from 'react'
import { ScenePanel, Ripple } from '@/components/ScenePanel'
import { ControlPanel } from '@/components/ControlPanel'
import { useEarthquakeData, Earthquake } from '@/hooks/useEarthquakeData'
import './App.css'

export default function App() {
  const { earthquakes, loading, error } = useEarthquakeData()
  const [minMagnitude, setMinMagnitude] = useState(3.0)
  const [selectedEarthquake, setSelectedEarthquake] = useState<Earthquake | null>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [statsKey, setStatsKey] = useState(0)

  const filteredEarthquakes = useMemo(() => {
    return earthquakes.filter((eq) => eq.magnitude >= minMagnitude)
  }, [earthquakes, minMagnitude])

  const statistics = useMemo(() => {
    if (filteredEarthquakes.length === 0) {
      return {
        count: 0,
        maxMagnitude: 0,
        avgDepth: 0
      }
    }

    const maxMagnitude = Math.max(...filteredEarthquakes.map((eq) => eq.magnitude))
    const avgDepth = Math.round(
      filteredEarthquakes.reduce((sum, eq) => sum + eq.depth, 0) / filteredEarthquakes.length
    )

    return {
      count: filteredEarthquakes.length,
      maxMagnitude,
      avgDepth
    }
  }, [filteredEarthquakes, statsKey])

  useEffect(() => {
    const interval = setInterval(() => {
      setStatsKey((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleMarkerClick = useCallback((earthquake: Earthquake) => {
    setSelectedEarthquake(earthquake)
    const newRipple: Ripple = {
      id: `${earthquake.longitude}-${earthquake.latitude}-${Date.now()}`,
      longitude: earthquake.longitude,
      latitude: earthquake.latitude,
      startTime: performance.now()
    }
    setRipples((prev) => [...prev, newRipple])
  }, [])

  const handleRippleComplete = useCallback((id: string) => {
    setRipples((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const handleListClick = useCallback(
    (earthquake: Earthquake) => {
      handleMarkerClick(earthquake)
    },
    [handleMarkerClick]
  )

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error">加载失败: {error}</div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="scene-wrapper">
          <ScenePanel
            earthquakes={filteredEarthquakes}
            selectedEarthquake={selectedEarthquake}
            ripples={ripples}
            onMarkerClick={handleMarkerClick}
            onRippleComplete={handleRippleComplete}
          />
        </div>
        <div className="panel-wrapper">
          <ControlPanel
            earthquakes={filteredEarthquakes}
            selectedEarthquake={selectedEarthquake}
            minMagnitude={minMagnitude}
            onMinMagnitudeChange={setMinMagnitude}
            onEarthquakeClick={handleListClick}
          />
        </div>
      </div>
      <div className="stats-bar" key={statsKey}>
        <span>当前显示 {statistics.count} 条地震记录</span>
        <span>|</span>
        <span>最大震级 M {statistics.maxMagnitude.toFixed(1)}</span>
        <span>|</span>
        <span>平均深度 {statistics.avgDepth} 公里</span>
      </div>
    </div>
  )
}
