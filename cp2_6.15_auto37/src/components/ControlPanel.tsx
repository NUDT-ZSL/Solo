import { useCallback, useEffect, useRef } from 'react'
import { useTrailStore } from '../store/trailStore'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function ControlPanel() {
  const trailPoints = useTrailStore((s) => s.trailPoints)
  const currentIndex = useTrailStore((s) => s.currentIndex)
  const isPlaying = useTrailStore((s) => s.isPlaying)
  const playbackSpeed = useTrailStore((s) => s.playbackSpeed)
  const setCurrentIndex = useTrailStore((s) => s.setCurrentIndex)
  const setIsPlaying = useTrailStore((s) => s.setIsPlaying)
  const setPlaybackSpeed = useTrailStore((s) => s.setPlaybackSpeed)
  const setCurrentSlope = useTrailStore((s) => s.setCurrentSlope)
  const setTotalClimb = useTrailStore((s) => s.setTotalClimb)

  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const progressRef = useRef<HTMLDivElement>(null)

  const totalPoints = trailPoints.length
  const totalTime = totalPoints > 1 ? (trailPoints[totalPoints - 1].time - trailPoints[0].time) / 1000 : 0
  const currentTime = totalPoints > 0 && currentIndex < totalPoints
    ? (trailPoints[currentIndex].time - trailPoints[0].time) / 1000
    : 0

  const progress = totalPoints > 1 ? (currentIndex / (totalPoints - 1)) * 100 : 0

  const calculateTotalClimb = useCallback(() => {
    let climb = 0
    for (let i = 1; i <= currentIndex && i < trailPoints.length; i++) {
      const diff = trailPoints[i].ele - trailPoints[i - 1].ele
      if (diff > 0) climb += diff
    }
    setTotalClimb(climb)
  }, [currentIndex, trailPoints, setTotalClimb])

  const calculateSlope = useCallback(() => {
    if (currentIndex < 1 || currentIndex >= trailPoints.length) {
      setCurrentSlope(0)
      return
    }

    const prev = trailPoints[currentIndex - 1]
    const curr = trailPoints[currentIndex]

    const lat1 = prev.lat * Math.PI / 180
    const lat2 = curr.lat * Math.PI / 180
    const dLat = lat2 - lat1
    const dLon = (curr.lon - prev.lon) * Math.PI / 180

    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = 6371000 * c

    const eleDiff = curr.ele - prev.ele
    const slope = distance > 0 ? Math.atan(eleDiff / distance) * 180 / Math.PI : 0

    setCurrentSlope(slope)
  }, [currentIndex, trailPoints, setCurrentSlope])

  useEffect(() => {
    if (trailPoints.length > 0) {
      calculateTotalClimb()
      calculateSlope()
    }
  }, [currentIndex, calculateTotalClimb, calculateSlope, trailPoints.length])

  useEffect(() => {
    if (!isPlaying || totalPoints <= 1) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }

      const delta = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      const pointsPerSecond = 30 * playbackSpeed
      const newIndexFloat = currentIndex + delta * pointsPerSecond
      const newIndex = Math.floor(newIndexFloat)

      if (newIndex >= totalPoints - 1) {
        setCurrentIndex(totalPoints - 1)
        setIsPlaying(false)
        return
      }

      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      lastTimeRef.current = 0
    }
  }, [isPlaying, currentIndex, totalPoints, playbackSpeed, setCurrentIndex, setIsPlaying])

  const handlePlayPause = useCallback(() => {
    if (totalPoints === 0) return

    if (currentIndex >= totalPoints - 1) {
      setCurrentIndex(0)
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, currentIndex, totalPoints, setCurrentIndex, setIsPlaying])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || totalPoints <= 1) return

    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    const newIndex = Math.floor(ratio * (totalPoints - 1))

    setCurrentIndex(newIndex)
  }, [totalPoints, setCurrentIndex])

  const speeds = [0.5, 1, 2, 4]

  if (totalPoints === 0) {
    return null
  }

  return (
    <div className="control-panel">
      <button
        className="play-btn"
        onClick={handlePlayPause}
        title={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div className="progress-container">
        <div
          ref={progressRef}
          className="progress-bar"
          onClick={handleProgressClick}
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <div className="progress-thumb" style={{ left: `${progress}%` }} />
        </div>
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalTime)}</span>
        </div>
      </div>

      <div className="speed-buttons">
        {speeds.map((speed) => (
          <button
            key={speed}
            className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
            onClick={() => setPlaybackSpeed(speed)}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  )
}
