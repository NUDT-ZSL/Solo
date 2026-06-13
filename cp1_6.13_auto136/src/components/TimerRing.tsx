import { useEffect, useRef, useState } from 'react'

interface TimerRingProps {
  duration?: number
  size?: number
  color?: string
  strokeWidth?: number
  isRunning?: boolean
  onComplete?: () => void
  label?: string
}

export function TimerRing({
  duration = 3,
  size = 60,
  color = '#6366f1',
  strokeWidth = 4,
  isRunning = false,
  onComplete,
  label,
}: TimerRingProps) {
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)
  const [displaySeconds, setDisplaySeconds] = useState(duration)

  useEffect(() => {
    if (!isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    startTimeRef.current = performance.now()

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return

      const elapsed = (currentTime - startTimeRef.current) / 1000
      const newProgress = Math.min(elapsed / duration, 1)
      const remaining = Math.max(0, Math.ceil(duration - elapsed))

      setProgress(newProgress)
      setDisplaySeconds(remaining)

      if (newProgress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        onComplete?.()
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRunning, duration, onComplete])

  const reset = () => {
    setProgress(0)
    setDisplaySeconds(duration)
    startTimeRef.current = null
  }

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: size * 0.35,
            fontWeight: 700,
            color: '#e2e8f0',
            lineHeight: 1,
          }}
        >
          {displaySeconds}
        </div>
        {label && (
          <div
            style={{
              fontSize: size * 0.12,
              color: '#94a3b8',
              marginTop: 2,
            }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  )
}

export default TimerRing
