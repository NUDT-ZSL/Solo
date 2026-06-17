import { useState, useEffect, useRef, useMemo } from 'react'
import { useCityStore } from './store'

interface RollingDigitProps {
  targetDigit: number
  delay?: number
}

function RollingDigit({ targetDigit, delay = 0 }: RollingDigitProps) {
  const [displayOffset, setDisplayOffset] = useState(0)
  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const prevDigitRef = useRef(targetDigit)
  const startOffsetRef = useRef(0)
  const delayPassedRef = useRef(false)
  const delayTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (prevDigitRef.current === targetDigit) {
      return
    }

    delayPassedRef.current = delay === 0
    startOffsetRef.current = displayOffset

    const oldDigit = prevDigitRef.current
    prevDigitRef.current = targetDigit

    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
    }
    if (delayTimerRef.current) {
      window.clearTimeout(delayTimerRef.current)
    }

    startTimeRef.current = null

    let steps = (targetDigit - oldDigit + 10) % 10
    if (steps > 5) steps = steps - 10
    const totalOffsetChange = steps

    const startDelay = () => {
      if (delay > 0 && !delayPassedRef.current) {
        delayTimerRef.current = window.setTimeout(() => {
          delayPassedRef.current = true
          runAnimation()
        }, delay)
      } else {
        runAnimation()
      }
    }

    const runAnimation = () => {
      const animate = (timestamp: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = timestamp
        }

        const elapsed = timestamp - startTimeRef.current
        const duration = 600
        const progress = Math.min(1, elapsed / duration)

        const t = progress
        const easeOutBack = 1 + (2.70158 + 1) * Math.pow(t - 1, 3) + 2.70158 * Math.pow(t - 1, 2)

        const newOffset = startOffsetRef.current + totalOffsetChange * easeOutBack
        setDisplayOffset(newOffset)

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate)
        } else {
          const finalMod = ((targetDigit % 10) + 10) % 10
          const currentMod = ((newOffset % 10) + 10) % 10
          const finalNormalized = newOffset + (finalMod - currentMod)
          setDisplayOffset(finalNormalized)
        }
      }

      animRef.current = requestAnimationFrame(animate)
    }

    startDelay()

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
      }
      if (delayTimerRef.current) {
        window.clearTimeout(delayTimerRef.current)
      }
    }
  }, [targetDigit, delay])

  const DIGIT_HEIGHT = 40

  const renderDigits = () => {
    const digits = []
    const baseIndex = Math.floor(displayOffset / 10) * 10

    for (let offset = -2; offset <= 12; offset++) {
      const n = ((baseIndex + offset) % 10 + 10) % 10
      const key = baseIndex + offset
      digits.push(
        <div
          key={key}
          style={{
            height: `${DIGIT_HEIGHT}px`,
            lineHeight: `${DIGIT_HEIGHT}px`,
            fontSize: '28px',
            fontWeight: 800,
            color: '#1a1a1a',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
            textAlign: 'center',
            userSelect: 'none'
          }}
        >
          {n}
        </div>
      )
    }
    return digits
  }

  const normalizedTranslate = -((displayOffset - Math.floor(displayOffset / 10) * 10 + 2) * DIGIT_HEIGHT)

  return (
    <div
      style={{
        display: 'inline-block',
        width: '32px',
        height: `${DIGIT_HEIGHT}px`,
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 30%, #ffffff 70%, #f0f0f0 100%)',
        borderRadius: '4px',
        border: '1px solid #d0d0d0',
        boxShadow: `
          inset 0 2px 4px rgba(0,0,0,0.08),
          inset 0 -1px 2px rgba(0,0,0,0.04),
          0 1px 0 rgba(255,255,255,0.8)
        `,
        margin: '0 1px',
        textAlign: 'center',
        verticalAlign: 'middle',
        zIndex: 1
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          background: `
            linear-gradient(180deg,
              rgba(0,0,0,0.12) 0%,
              rgba(0,0,0,0) 18%,
              rgba(0,0,0,0) 50%,
              rgba(0,0,0,0.04) 50%,
              rgba(0,0,0,0) 82%,
              rgba(0,0,0,0.1) 100%
            )
          `,
          zIndex: 3,
          pointerEvents: 'none',
          borderRadius: '4px'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.15), transparent)',
          zIndex: 4,
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '100%',
          zIndex: 2,
          willChange: 'transform',
          transform: `translateY(${normalizedTranslate}px)`,
          transition: 'none'
        }}
      >
        {renderDigits()}
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
  const digits = useMemo(() => {
    const scaledValue = Math.round(value * Math.pow(10, decimals))
    const str = scaledValue.toString().padStart(decimals + 1, '0')
    const chars = str.split('')
    return chars
  }, [value, decimals])

  const displayDigits = useMemo(() => {
    const result: { type: 'digit' | 'dot' | 'prefix'; value?: number; delay: number }[] = []

    const integerCount = digits.length - decimals
    let hasLeadingZero = true

    digits.forEach((char, i) => {
      const baseDelay = 30
      const digitPosition = i < integerCount ? integerCount - 1 - i : i - integerCount + 1
      const delay = digitPosition * baseDelay

      if (char === '.') {
        result.push({ type: 'dot', delay })
      } else {
        const num = parseInt(char, 10)
        if (i < integerCount - 1 && hasLeadingZero && num === 0) {
          result.push({ type: 'prefix', delay })
        } else {
          hasLeadingZero = false
          result.push({ type: 'digit', value: num, delay })
        }
      }
    })

    return result
  }, [digits, decimals])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '40px',
        position: 'relative'
      }}
    >
      {displayDigits.map((item, i) => {
        if (item.type === 'dot') {
          return (
            <span
              key={`dot-${i}`}
              style={{
                fontSize: '28px',
                fontWeight: 800,
                margin: '0 2px',
                color: '#1a1a1a',
                lineHeight: '40px',
                display: 'inline-block',
                verticalAlign: 'middle'
              }}
            >
              .
            </span>
          )
        }
        if (item.type === 'prefix') {
          return (
            <div
              key={`space-${i}`}
              style={{
                display: 'inline-block',
                width: '16px',
                height: '40px',
                verticalAlign: 'middle'
              }}
            />
          )
        }
        return (
          <RollingDigit
            key={`digit-${i}`}
            targetDigit={item.value as number}
            delay={item.delay}
          />
        )
      })}
      <span style={{
        fontSize: '20px',
        fontWeight: 700,
        marginLeft: '8px',
        color: '#1a1a1a',
        lineHeight: '40px',
        display: 'inline-block',
        verticalAlign: 'middle'
      }}>
        {suffix}
      </span>
    </div>
  )
}

function FlameIcon({ intensity }: { intensity: number }) {
  const [color, setColor] = useState('#FF9933')

  useEffect(() => {
    let targetColor = '#FF9933'
    if (intensity > 5) {
      targetColor = '#FF3333'
    } else if (intensity < 3) {
      targetColor = '#3399FF'
    }
    setColor(targetColor)
  }, [intensity])

  return (
    <div style={{
      marginLeft: '8px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        style={{
          filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.15))`
        }}
      >
        <defs>
          <linearGradient id={`flameGrad-${intensity > 5 ? 'hot' : intensity < 3 ? 'cool' : 'warm'}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <path
          d="M12 2C12 8 8 10 8 14C8 16.2091 9.79086 18 12 18C14.2091 18 16 16.2091 16 14C16 12 15 11 13 12C13 10 15 9 16 7C16 4 13.5 2 12 2Z"
          fill={`url(#flameGrad-${intensity > 5 ? 'hot' : intensity < 3 ? 'cool' : 'warm'})`}
          stroke="#444"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <path
          d="M10.5 14C10.5 12.8954 11.3954 12 12.5 12C12.8807 12 13.2 13.1 13.2 14C13.2 14.6627 12.6627 15.2 12 15.2C11.3373 15.2 10.8 14.6627 10.8 14C10.8 13.6193 11.1193 13.3 11.5 13.3L10.5 14Z"
          fill="#FFEB3B"
          opacity="0.9"
          style={{ transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
    </div>
  )
}

export default function TemperaturePanel() {
  const { temperatureStats } = useCityStore()
  const { maxTemp, minTemp, avgTemp, heatIslandIntensity } = temperatureStats

  const borderGradient = useMemo(() => {
    const minHue = Math.max(180, 210 - (minTemp - 18) * 3)
    const maxHue = Math.max(0, Math.min(40, 20 + (maxTemp - 35) * 12))
    return `linear-gradient(135deg,
      hsl(${minHue}, 70%, 82%) 0%,
      hsl(${Math.round((minHue + maxHue) / 2)}, 75%, 80%) 50%,
      hsl(${maxHue}, 75%, 78%) 100%)`
  }, [minTemp, maxTemp])

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 100
      }}
    >
      <div
        style={{
          position: 'relative',
          padding: '3px',
          borderRadius: '14px',
          background: borderGradient,
          boxShadow: `
            0 6px 20px rgba(0, 0, 0, 0.08),
            0 2px 6px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.6)
          `,
          transition: 'background 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div
          style={{
            background: `
              linear-gradient(180deg,
                #ffffff 0%,
                #fcfcfe 40%,
                #fafafb 100%
              )
            `,
            borderRadius: '12px',
            padding: '18px 24px',
            minWidth: '340px',
            boxShadow: `
              inset 0 1px 0 rgba(255, 255, 255, 1),
              inset 0 -1px 0 rgba(0, 0, 0, 0.03)
            `
          }}
        >
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333',
            borderBottom: '2px solid #f0f0f0',
            paddingBottom: '8px',
            letterSpacing: '0.3px'
          }}>
            🌡️ 温度统计
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', rowGap: '16px' }}>
            <div>
              <div style={{
                fontSize: '12px',
                color: '#888',
                marginBottom: '8px',
                fontWeight: 500,
                letterSpacing: '0.5px'
              }}>
                最高温度
              </div>
              <ScrollingNumber value={maxTemp} suffix="°C" />
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: '#888',
                marginBottom: '8px',
                fontWeight: 500,
                letterSpacing: '0.5px'
              }}>
                最低温度
              </div>
              <ScrollingNumber value={minTemp} suffix="°C" />
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: '#888',
                marginBottom: '8px',
                fontWeight: 500,
                letterSpacing: '0.5px'
              }}>
                平均温度
              </div>
              <ScrollingNumber value={avgTemp} suffix="°C" />
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: '#888',
                marginBottom: '8px',
                fontWeight: 500,
                letterSpacing: '0.5px',
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
      </div>
    </div>
  )
}
