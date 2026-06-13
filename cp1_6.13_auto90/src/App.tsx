import { useState, useEffect, useRef, useCallback } from 'react'
import { SceneManager } from './SceneManager'
import UIPanel from './UIPanel'
import axios from 'axios'

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function computeStats(data: number[][]) {
  let sum = 0
  let count = 0
  let maxVal = -1
  let maxX = 0
  let maxZ = 0
  for (let row = 0; row < data.length; row++) {
    for (let col = 0; col < data[row].length; col++) {
      const v = data[row][col]
      sum += v
      count++
      if (v > maxVal) {
        maxVal = v
        maxX = col
        maxZ = row
      }
    }
  }
  return {
    average: count > 0 ? sum / count : 0,
    max: { x: maxX, z: maxZ, value: maxVal },
  }
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneManager | null>(null)
  const [currentTime, setCurrentTime] = useState(formatTime(new Date()))
  const [noiseData, setNoiseData] = useState<number[][]>([])
  const [averageNoise, setAverageNoise] = useState(0)
  const [maxNoise, setMaxNoise] = useState({ x: 0, z: 0, value: 0 })
  const [isPlaying, setIsPlaying] = useState(false)
  const [timelineValue, setTimelineValue] = useState(100)
  const [totalSnapshots, setTotalSnapshots] = useState(0)
  const [historyInfo, setHistoryInfo] = useState<{ oldest: number; newest: number } | null>(null)
  const playRef = useRef(isPlaying)
  const timelineRef = useRef(timelineValue)

  useEffect(() => { playRef.current = isPlaying }, [isPlaying])
  useEffect(() => { timelineRef.current = timelineValue }, [timelineValue])

  const fetchNoiseData = useCallback(async (timestamp?: number) => {
    try {
      const params: Record<string, string | number> = {}
      if (timestamp) params.timestamp = timestamp
      const res = await axios.get('/api/noise-data', { params })
      const data = res.data.data as number[][]
      if (data && data.length > 0) {
        setNoiseData(data)
        const stats = computeStats(data)
        setAverageNoise(stats.average)
        setMaxNoise(stats.max)
        if (sceneRef.current) {
          sceneRef.current.updateNoiseData(data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch noise data:', err)
    }
  }, [])

  const fetchHistoryInfo = useCallback(async () => {
    try {
      const res = await axios.get('/api/noise-history-info')
      setTotalSnapshots(res.data.totalSnapshots)
      setHistoryInfo({
        oldest: res.data.oldestTimestamp,
        newest: res.data.newestTimestamp,
      })
    } catch (err) {
      console.error('Failed to fetch history info:', err)
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTime(new Date()))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      const manager = new SceneManager(containerRef.current)
      manager.enableOrbitControls()
      sceneRef.current = manager
      return () => {
        manager.destroy()
        sceneRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    fetchNoiseData()
    fetchHistoryInfo()
    const interval = setInterval(() => {
      if (!playRef.current && timelineRef.current >= 100) {
        fetchNoiseData()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchNoiseData, fetchHistoryInfo])

  useEffect(() => {
    fetchHistoryInfo()
    const interval = setInterval(fetchHistoryInfo, 10000)
    return () => clearInterval(interval)
  }, [fetchHistoryInfo])

  useEffect(() => {
    if (!isPlaying) return
    let step = 0
    const interval = setInterval(() => {
      step++
      setTimelineValue(prev => {
        const next = prev + (100 / 60)
        if (next >= 100) {
          setIsPlaying(false)
          return 100
        }
        return next
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [isPlaying])

  useEffect(() => {
    if (!historyInfo) return
    const range = historyInfo.newest - historyInfo.oldest
    if (range <= 0) return
    const targetTs = historyInfo.newest - (range * (1 - timelineValue / 100))
    fetchNoiseData(Math.round(targetTs))
  }, [timelineValue, historyInfo, fetchNoiseData])

  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const handleTimelineChange = useCallback((value: number) => {
    setTimelineValue(value)
    setIsPlaying(false)
  }, [])

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0f172a',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      <UIPanel
        currentTime={currentTime}
        averageNoise={averageNoise}
        maxNoise={maxNoise}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        timelineValue={timelineValue}
        onTimelineChange={handleTimelineChange}
        totalSnapshots={totalSnapshots}
      />
    </div>
  )
}
