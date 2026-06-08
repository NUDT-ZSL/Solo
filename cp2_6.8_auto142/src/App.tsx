import React, { useState, useEffect, useCallback } from 'react'
import EmotionForm from './components/EmotionForm'
import Heatmap from './components/Heatmap'
import ActivityRadar from './components/ActivityRadar'
import { getTrends, TrendsResponse } from './api'

const formatDate = (d: Date): string => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDefaultRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  }
}

const App: React.FC = () => {
  const defaultRange = getDefaultRange()
  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)
  const [trends, setTrends] = useState<TrendsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchTrends = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTrends(startDate, endDate)
      setTrends(data)
    } catch (err) {
      console.error('Failed to fetch trends:', err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, refreshKey])

  useEffect(() => {
    fetchTrends()
  }, [fetchTrends])

  const handleSubmitted = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="app-container">
      <header className="header">情绪日记本</header>

      <div className="date-filter">
        <label>
          起始日期：
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </label>
        <label>
          结束日期：
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </label>
      </div>

      <div className="content-wrapper">
        <EmotionForm onSubmitted={handleSubmitted} />

        <div className="charts-section" key={refreshKey}>
          {loading || !trends ? (
            <>
              <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#A0AEC0' }}>加载中...</span>
              </div>
              <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#A0AEC0' }}>加载中...</span>
              </div>
            </>
          ) : (
            <>
              <Heatmap data={trends.heatmap} />
              <ActivityRadar data={trends.radar} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
