import React, { useEffect, useState } from 'react'

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

  useEffect(() => {
    const duration = 1200
    const steps = 6
    const stepDuration = duration / steps
    const increment = value / steps
    let currentStep = 0

    const interval = setInterval(() => {
      currentStep++
      setDisplayValue(Math.floor(increment * currentStep))
      if (currentStep >= steps) {
        clearInterval(interval)
      }
    }, stepDuration)

    const timeout = setTimeout(() => {
      setVisible(false)
      onComplete()
    }, duration)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [value, onComplete])

  const color = type === 'damage' ? '#e63946' : type === 'heal' ? '#2ecc71' : '#3498db'

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
      {type === 'damage' ? '-' : '+'}
      {displayValue}
    </div>
  )
}
