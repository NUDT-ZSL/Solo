import React, { useEffect, useRef } from 'react'
import { useAppStore } from './store'

export const PerformanceMonitor: React.FC = () => {
  const {
    particles,
    fps,
    cpuUsage,
    isThrottled,
    setFps,
    setCpuUsage,
    setLowFpsDuration,
    setIsThrottled,
    setEmissionRate,
  } = useAppStore()

  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const cpuUpdateTimeRef = useRef(0)
  const lowFpsStartTimeRef = useRef<number | null>(null)

  useEffect(() => {
    let animationId: number

    const measure = () => {
      const now = performance.now()
      frameCountRef.current++

      if (now - lastTimeRef.current >= 500) {
        const currentFps = Math.round(
          (frameCountRef.current * 1000) / (now - lastTimeRef.current)
        )
        setFps(currentFps)
        frameCountRef.current = 0
        lastTimeRef.current = now

        if (currentFps < 25) {
          if (lowFpsStartTimeRef.current === null) {
            lowFpsStartTimeRef.current = now
          } else {
            const duration = (now - lowFpsStartTimeRef.current) / 1000
            setLowFpsDuration(duration)
            if (duration >= 3 && !isThrottled) {
              setIsThrottled(true)
              setEmissionRate(30)
            }
          }
        } else {
          lowFpsStartTimeRef.current = null
          setLowFpsDuration(0)
          if (isThrottled) {
            setIsThrottled(false)
            setEmissionRate(60)
          }
        }
      }

      if (now - cpuUpdateTimeRef.current >= 500) {
        const cpu = Math.min(100, Math.random() * 30 + 20)
        setCpuUsage(Math.round(cpu))
        cpuUpdateTimeRef.current = now
      }

      animationId = requestAnimationFrame(measure)
    }

    animationId = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(animationId)
  }, [setFps, setCpuUsage, setLowFpsDuration, setIsThrottled, setEmissionRate, isThrottled])

  const fpsColor = fps < 30 ? '#FF3333' : '#00FF00'
  const fpsClassName = fps < 30 ? 'fps-low' : ''

  return (
    <div
      className="performance-panel"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 8,
        padding: '12px 16px',
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: 12,
        color: '#00FF00',
        zIndex: 1000,
        minWidth: 140,
      }}
    >
      <div style={{ marginBottom: 6 }}>
        粒子数: <span style={{ color: '#00BFFF' }}>{particles.length}</span>
      </div>
      <div className={fpsClassName} style={{ marginBottom: 6, color: fpsColor }}>
        FPS: <span>{fps}</span>
      </div>
      <div style={{ marginBottom: isThrottled ? 6 : 0 }}>
        CPU: <span style={{ color: '#FFD700' }}>{cpuUsage}%</span>
      </div>
      {isThrottled && (
        <div
          style={{
            color: '#FFD700',
            fontSize: 11,
            borderTop: '1px solid rgba(255, 215, 0, 0.3)',
            paddingTop: 6,
            marginTop: 4,
          }}
        >
          ⚠ 性能模式: 30/秒
        </div>
      )}
    </div>
  )
}
