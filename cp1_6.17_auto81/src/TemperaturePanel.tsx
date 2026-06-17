import { useState, useEffect, useRef } from 'react'
import { useCityStore } from './store'

interface RollingDigitProps {
  value: number
  digitIndex: number
  totalDigits: number
}

function RollingDigit({ value, digitIndex, totalDigits }: RollingDigitProps) {
  const [currentValue, setCurrentValue] = useState(0)
  const [offset, setOffset] = useState(0)
  const targetValueRef = useRef(0)
  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const divisor = Math.pow(10, totalDigits - 1 - digitIndex)
  const displayValue = Math.floor((value / divisor) % 10)

  useEffect(() => {
    targetValueRef.current = displayValue

    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
    }

    startTimeRef.current = null
    const startOffset = offset

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const duration = 500
      const progress = Math.min(1, elapsed / duration)

      const easeOutCubic = 1 - Math.pow(1 - progress, 3)

      const totalChange = (displayValue - currentValue + 10) % 10
      const actualChange = totalChange > 5 ? totalChange - 10 : totalChange

      const newOffset = startOffset + actualChange * easeOutCubic
      setOffset(newOffset)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setCurrentValue(displayValue)
        setOffset(0)
      }
    }

    if (displayValue !== currentValue) {
      animRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
      }
    }
  }, [displayValue])

  const visibleValue = currentValue + offset
  const normalizedValue = ((visibleValue % 10) + 10) % 10

  return (
    <div style={{
      display: 'inline-block',
      width: '28px',
      height: '36px',
      overflow: 'hidden',
      position: 'relative',
      background: 'linear-gradient(to bottom, #f8f8f8 0%, #ffffff 50%, #f8f8f8 100%)',
      borderRadius: '4px',
      border: '1px solid #ddd',
      margin: '0 1px',
      textAlign: 'center',
      verticalAlign: 'middle'
    }}>
      <div style={{
        position: 'absolute',
        width: '100%',
        transition: 'none',
        transform: `translateY(-${normalizedValue * 36}px)`
      }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <div
            key={n}
            style={{
              height: '36px',
              lineHeight: '36px',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1a1a1a',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace'
            }}
          >
            {n}
          </div>
        ))}
      </div>
    </div>
  )
}

interface ScrollingNumberProps {
  value: number
  decimals?: number
  suffix?: string
}

function ScrollingNumber({ value, decimals = 1, suffix = '' }: ScrollingNumberProps) {
  const scaledValue = Math.round(value * Math.pow(10, decimals))
  const totalDigits = 3 + decimals

  const digits: JSX.Element[] = []
  let hasNonZero = false

  for (let i = 0; i < totalDigits; i++) {
    const divisor = Math.pow(10, totalDigits - 1 - i)
    const digit = Math.floor((scaledValue / divisor) % 10)
    const isDecimalPoint = i === totalDigits - decimals

    if (isDecimalPoint) {
      digits.push(
        <span
          key={`dot-${i}`}
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 2px',
            color: '#1a1a1a',
            lineHeight: '36px',
            display: 'inline-block',
            verticalAlign: 'middle'
          }}
        >
          .
        </span>
      )
    }

    if (!hasNonZero && digit === 0 && i < totalDigits - decimals - 1) {
      digits.push(
        <div
          key={`empty-${i}`}
          style={{
            display: 'inline-block',
            width: '28px',
            height: '36px',
            verticalAlign: 'middle'
          }}
        />
      )
    } else {
      hasNonZero = true
      digits.push(
        <RollingDigit
          key={`digit-${i}`}
          value={scaledValue}
          digitIndex={i}
          totalDigits={totalDigits}
        />
      )
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '36px' }}>
      {digits}
      <span style={{
        fontSize: '18px',
        fontWeight: 'bold',
        marginLeft: '6px',
        color: '#1a1a1a',
        lineHeight: '36px',
        display: 'inline-block',
        verticalAlign: 'middle'
      }}>
        {suffix}
      </span>
    </div>
  )
}

function FlameIcon({ intensity }: { intensity: number }) {
  const getColor = (): string => {
    if (intensity > 5) return '#FF3333'
    if (intensity < 3) return '#3399FF'
    return '#FF9933'
  }

  const color = getColor()

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      style={{ marginLeft: '8px', transition: 'fill 0.3s ease' }}
    >
      <path
        d="M12 2C12 8 8 10 8 14C8 16.2091 9.79086 18 12 18C14.2091 18 16 16.2091 16 14C16 12 15 11 13 12C13 10 15 9 16 7C16 4 13.5 2 12 2Z"
        fill={color}
        stroke="#333"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 14C10 12.8954 10.8954 12 12 12C12.5523 12 13 13 13 14C13 14.5523 12.5523 15 12 15C11.4477 15 11 14.5523 11 14C11 13.4477 10.5523 13 10 13V14Z"
        fill="#FFEB3B"
        opacity="0.8"
      />
    </svg>
  )
}

export default function TemperaturePanel() {
  const { temperatureStats } = useCityStore()
  const { maxTemp, minTemp, avgTemp, heatIslandIntensity } = temperatureStats

  const borderGradient = `linear-gradient(135deg, 
    hsl(${210 - (minTemp - 18) * 3}, 80%, 85%) 0%, 
    hsl(${0 + (maxTemp - 35) * 10}, 80%, 85%) 100%)`

  return (
    <div
      style={{
        position: 'relative',
        background: 'white',
        borderRadius: '12px',
        padding: '18px 24px',
        boxShadow: '0 4px 16px rgba(224, 224, 224, 0.8)',
        minWidth: '340px',
        zIndex: 100
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -2,
          borderRadius: '12px',
          background: borderGradient,
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />

      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#333',
        borderBottom: '2px solid #eee',
        paddingBottom: '8px'
      }}>
        🌡️ 温度统计
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
            最高温度
          </div>
          <ScrollingNumber value={maxTemp} suffix="°C" />
        </div>

        <div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
            最低温度
          </div>
          <ScrollingNumber value={minTemp} suffix="°C" />
        </div>

        <div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
            平均温度
          </div>
          <ScrollingNumber value={avgTemp} suffix="°C" />
        </div>

        <div>
          <div style={{
            fontSize: '12px',
            color: '#888',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center'
          }}>
            热岛强度
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ScrollingNumber value={heatIslandIntensity} suffix="°C" />
            <FlameIcon intensity={heatIslandIntensity} />
          </div>
        </div>
      </div>
    </div>
  )
}
