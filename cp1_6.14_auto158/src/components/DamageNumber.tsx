import React, { useEffect, useState, useRef } from 'react'

interface DamageNumberProps {
  value: number
  type: 'damage' | 'heal' | 'shield'
  x: number
  y: number
  onComplete: () => void
}

export const DamageNumber: React.FC<DamageNumberProps> = ({
  value,
  type,
  x,
  y,
  onComplete,
}) => {
  const [displayValue, setDisplayValue] = useState(0)
  const [visible, setVisible] = useState(true)
  const animationRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    const duration = 1200
    const updatesPerSecond = 5
    const updateInterval = 1000 / updatesPerSecond
    let lastUpdate = 0

    const animate = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp
        lastUpdateRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current

      if (timestamp - lastUpdateRef.current >= updateInterval) {
        const progress = Math.min(1, elapsed / duration)
        const currentValue = Math.floor(value * progress)
        setDisplayValue(currentValue)
        lastUpdateRef.current = timestamp
      }

      if (elapsed < duration) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    const timeout = setTimeout(() => {
      setVisible(false)
      onComplete()
    }, duration)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
      clearTimeout(timeout)
    }
  }, [value, onComplete])

  const isDecrease = type === 'damage'
  const color = isDecrease ? '#e63946' : '#2ecc71'
  const prefix = isDecrease ? '-' : '+'

  if (!visible) return null

  return (
    <div
      className={`damage-number ${type}`}
      style={{
        left: x,
        top: y,
        color,
      }}
    >
      {prefix}
      {displayValue}
    </div>
  )
}
