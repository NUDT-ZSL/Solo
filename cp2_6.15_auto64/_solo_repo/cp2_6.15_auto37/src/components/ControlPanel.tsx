import { useCallback, useEffect, useRef, useState } from 'react'
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
  const smoothIndexRef = useRef(currentIndex)
  const targetIndexRef = useRef(currentIndex)
  const [displayProgress, setDisplayProgress] = useState(0)

  const totalPoints = trailPoints.length
  const totalTime = totalPoints > 1
    ? (trailPoints[totalPoints - 1].time - trailPoints[0].time) / 1000
    : 0

  const getCurrentTime = useCallback(() => {
    if (totalPoints === 0) return 0
    const idx = Math.min(Math.max(Math.round(smoothIndexRef.current), 0), totalPoints - 1)
    return (trailPoints[idx].time - trailPoints[0].time) / 1000
  }, [totalPoints, trailPoints])

  const calculateTotalClimb = useCallback((idx: number) => {
    let climb = 0
    const endIdx = Math.min(idx, trailPoints.length - 1)
    for (let i = 1; i <= endIdx; i++) {
      const diff = trailPoints[i].ele - trailPoints[i - 1].ele
      if (diff > 0) climb += diff
    }
    setTotalClimb(climb)
  }, [trailPoints, setTotalClimb])

  const calculateSlope = useCallback((idx: number) => {
    if (idx < 1 || idx >= trailPoints.length) {
      setCurrentSlope(0)
      return
    }

    const prev = trailPoints[idx - 1]
    const curr = trailPoints[idx]

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
  }, [trailPoints, setCurrentSlope])

  useEffect(() => {
    targetIndexRef.current = currentIndex
  }, [currentIndex])

  useEffect(() => {
    const idx = Math.round(smoothIndexRef.current)
    calculateTotalClimb(idx)
    calculateSlope(idx)
  }, [smoothIndexRef.current, calculateTotalClimb, calculateSlope])

  useEffect(() => {
    let rafId: number
    const easeDuration = 0.3

    const animate = () => {
      const delta = 1 / 60
      const target = targetIndexRef.current
      const current = smoothIndexRef.current

      const diff = target - current
      const speed = 1 / easeDuration
      const step = diff * Math.min(1, delta * speed)

      if (Math.abs(diff) > 0.01) {
        smoothIndexRef.current = current + step
        const newIdx = Math.round(smoothIndexRef.current)
        if (newIdx !== currentIndex) {
          setCurrentIndex(newIdx)
        }
      } else {
        smoothIndexRef.current = target
      }

      if (totalPoints > 1) {
        const progress = (smoothIndexRef.current / (totalPoints - 1)) * 100
        setDisplayProgress(progress)
      }

      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [totalPoints, setCurrentIndex, currentIndex])

  useEffect(() => {
    if (!isPlaying || totalPoints <= 1) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const pointsPerSecond = 30 * playbackSpeed

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }

      const delta = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      const increment = delta * pointsPerSecond
      const newTarget = targetIndexRef.current + increment

      if (newTarget >= totalPoints - 1) {
        targetIndexRef.current = totalPoints - 1
        setCurrentIndex(totalPoints - 1)
        setIsPlaying(false)
        return
      }

      targetIndexRef.current = newTarget
      const newIdx = Math.floor(newTarget)
      if (newIdx !== currentIndex) {
        setCurrentIndex(newIdx)
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
  }, [isPlaying, playbackSpeed, totalPoints, setCurrentIndex, setIsPlaying, currentIndex])

  const handlePlayPause = useCallback(() => {
    if (totalPoints === 0) return

    if (targetIndexRef.current >= totalPoints - 1) {
      targetIndexRef.current = 0
      smoothIndexRef.current = 0
      setCurrentIndex(0)
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, totalPoints, setCurrentIndex, setIsPlaying])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || totalPoints <= 1) return

    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    const newIndex = ratio * (totalPoints - 1)

    targetIndexRef.current = newIndex
    setCurrentIndex(Math.round(newIndex))
  }, [totalPoints, setCurrentIndex])

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
  }, [setPlaybackSpeed])

  const speeds = [0.5, 1, 2, 4]

  if (totalPoints === 0) {
    return null
  }

  const currentTime = getCurrentTime()

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
          <div
            className="progress-fill"
            style={{
              width: `${displayProgress}%`,
              transition: 'none',
            }}
          />
          <div
            className="progress-thumb"
            style={{
              left: `${displayProgress}%`,
              transition: 'none',
            }}
          />
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
            onClick={() => handleSpeedChange(speed)}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  )
}
