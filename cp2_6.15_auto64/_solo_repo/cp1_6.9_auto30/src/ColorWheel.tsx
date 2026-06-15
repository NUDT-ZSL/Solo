import React, { useEffect, useRef, useState, useCallback } from 'react'
import { HSL, hslToCssString, angleToHue, angleToPercent, percentToAngle } from './utils/color'
import { dampFactor } from './utils/animation'

export type WheelType = 'h' | 's' | 'l'

export interface WheelParticleEvent {
  type: WheelType
  centerX: number
  centerY: number
  hsl: HSL
}

interface Props {
  hsl: HSL
  onChange: (type: WheelType, value: number) => void
  onParticleBurst: (e: WheelParticleEvent) => void
  hAngleTarget?: number
  sAngleTarget?: number
  lAngleTarget?: number
}

const WHEEL_SIZE = 100
const WHEEL_RADIUS = WHEEL_SIZE / 2
const DAMP = 0.85
const DRAG_THRESHOLD = 8

const wheelLabels: Record<WheelType, string> = {
  h: '色相 H',
  s: '饱和度 S',
  l: '明度 L'
}

export default function ColorWheel({ hsl, onChange, onParticleBurst, hAngleTarget, sAngleTarget, lAngleTarget }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverType, setHoverType] = useState<WheelType | null>(null)

  const hRef = useRef({ angle: hsl.h, vel: 0, dragging: false, lastAngle: 0, burstTick: 0 })
  const sRef = useRef({ angle: percentToAngle(hsl.s), vel: 0, dragging: false, lastAngle: 0, burstTick: 0 })
  const lRef = useRef({ angle: percentToAngle(hsl.l), vel: 0, dragging: false, lastAngle: 0, burstTick: 0 })

  const [hRender, setHRender] = useState(hsl.h)
  const [sRender, setSRender] = useState(percentToAngle(hsl.s))
  const [lRender, setLRender] = useState(percentToAngle(hsl.l))

  const tweenRef = useRef<{ type: WheelType; start: number; end: number; startTs: number; duration: number } | null>(null)

  useEffect(() => {
    if (hAngleTarget !== undefined) {
      const start = hRef.current.angle
      const diff = ((hAngleTarget - start) % 360 + 540) % 360 - 180
      tweenRef.current = { type: 'h', start, end: start + diff, startTs: performance.now(), duration: 400 }
    }
  }, [hAngleTarget])

  useEffect(() => {
    if (sAngleTarget !== undefined) {
      const start = sRef.current.angle
      const diff = ((sAngleTarget - start) % 360 + 540) % 360 - 180
      tweenRef.current = { type: 's', start, end: start + diff, startTs: performance.now(), duration: 400 }
    }
  }, [sAngleTarget])

  useEffect(() => {
    if (lAngleTarget !== undefined) {
      const start = lRef.current.angle
      const diff = ((lAngleTarget - start) % 360 + 540) % 360 - 180
      tweenRef.current = { type: 'l', start, end: start + diff, startTs: performance.now(), duration: 400 }
    }
  }, [lAngleTarget])

  const getCenterCoord = useCallback((type: WheelType): { x: number; y: number } => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    const idx = type === 'h' ? 0 : type === 's' ? 1 : 2
    const gap = 70
    const centerX = rect.width / 2
    const centerY = 60 + idx * (WHEEL_SIZE + gap) + WHEEL_RADIUS
    return { x: rect.left + centerX, y: rect.top + centerY }
  }, [])

  const handlePointerDown = (type: WheelType, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const ref = type === 'h' ? hRef : type === 's' ? sRef : lRef
    const { x, y } = getCenterCoord(type)
    const startAngle = Math.atan2(e.clientY - y, e.clientX - x) * 180 / Math.PI
    ref.current.dragging = true
    ref.current.lastAngle = startAngle
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (type: WheelType, e: React.PointerEvent<HTMLDivElement>) => {
    const ref = type === 'h' ? hRef : type === 's' ? sRef : lRef
    if (!ref.current.dragging) return
    const { x, y } = getCenterCoord(type)
    const currentAngle = Math.atan2(e.clientY - y, e.clientX - x) * 180 / Math.PI
    let delta = currentAngle - ref.current.lastAngle
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    ref.current.angle += delta
    ref.current.vel = delta
    ref.current.lastAngle = currentAngle
    ref.current.burstTick++
    if (Math.abs(delta) > 0.3) {
      const hslNow: HSL = {
        h: angleToHue(hRef.current.angle),
        s: angleToPercent(sRef.current.angle),
        l: angleToPercent(lRef.current.angle)
      }
      onChange(type, type === 'h' ? hslNow.h : type === 's' ? hslNow.s : hslNow.l)
      if (ref.current.burstTick % 3 === 0) {
        const coord = getCenterCoord(type)
        onParticleBurst({ type, centerX: coord.x, centerY: coord.y, hsl: hslNow })
      }
    }
  }

  const handlePointerUp = (type: WheelType, e: React.PointerEvent<HTMLDivElement>) => {
    const ref = type === 'h' ? hRef : type === 's' ? sRef : lRef
    ref.current.dragging = false
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
  }

  useEffect(() => {
    let rafId = 0
    let lastTs = performance.now()

    const loop = (ts: number) => {
      const dt = Math.min(64, ts - lastTs)
      lastTs = ts

      if (tweenRef.current) {
        const t = tweenRef.current
        const progress = Math.min(1, (ts - t.startTs) / t.duration)
        const eased = 1 - Math.pow(1 - progress, 3)
        const val = t.start + (t.end - t.start) * eased
        const ref = t.type === 'h' ? hRef : t.type === 's' ? sRef : lRef
        ref.current.angle = val
        if (progress >= 1) tweenRef.current = null
      }

      for (const entry of [{ r: hRef, t: 'h' as const }, { r: sRef, t: 's' as const }, { r: lRef, t: 'l' as const }]) {
        const ref = entry.r.current
        if (!ref.dragging && Math.abs(ref.vel) > 0.001) {
          const step = ref.vel * (dt / 16.6)
          ref.angle += step
          ref.vel = dampFactor(ref.vel, DAMP, 0.01)
        }
      }

      setHRender(hRef.current.angle)
      setSRender(sRef.current.angle)
      setLRender(lRef.current.angle)

      const hNow = angleToHue(hRef.current.angle)
      const sNow = angleToPercent(sRef.current.angle)
      const lNow = angleToPercent(lRef.current.angle)
      if (Math.abs(hNow - hsl.h) > 0.01 && !hRef.current.dragging && tweenRef.current?.type !== 'h') {
        onChange('h', hNow)
      }
      if (Math.abs(sNow - hsl.s) > 0.05 && !sRef.current.dragging && tweenRef.current?.type !== 's') {
        onChange('s', sNow)
      }
      if (Math.abs(lNow - hsl.l) > 0.05 && !lRef.current.dragging && tweenRef.current?.type !== 'l') {
        onChange('l', lNow)
      }

      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [hsl.h, hsl.s, hsl.l, onChange])

  const drawWheel = (type: WheelType, angleDeg: number, isHover: boolean, isDrag: boolean) => {
    const currentHsl: HSL = {
      h: angleToHue(hRef.current.angle),
      s: angleToPercent(sRef.current.angle),
      l: angleToPercent(lRef.current.angle)
    }
    let ringColor = ''
    if (type === 'h') {
      ringColor = `hsl(${angleToHue(angleDeg)}, 90%, 60%)`
    } else if (type === 's') {
      ringColor = `hsl(${currentHsl.h}, ${angleToPercent(angleDeg)}%, 60%)`
    } else {
      ringColor = `hsl(${currentHsl.h}, ${currentHsl.s}%, ${angleToPercent(angleDeg)}%)`
    }

    const pointerAngle = angleDeg
    const dotX = 50 + Math.cos(pointerAngle * Math.PI / 180) * 42
    const dotY = 50 + Math.sin(pointerAngle * Math.PI / 180) * 42

    const events = {
      onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => handlePointerDown(type, e),
      onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => handlePointerMove(type, e),
      onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => handlePointerUp(type, e),
      onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => handlePointerUp(type, e),
      onMouseEnter: () => setHoverType(type),
      onMouseLeave: () => setHoverType(prev => prev === type ? null : prev)
    }

    return (
      <div key={type} className="wheel-wrapper">
        <div
          className={`color-wheel ${isHover ? 'hover' : ''} ${isDrag ? 'grabbing' : ''}`}
          style={{
            width: WHEEL_SIZE,
            height: WHEEL_SIZE,
            borderColor: ringColor,
            transform: isHover || isDrag ? 'scale(1.05)' : 'scale(1)',
            cursor: isDrag ? 'grabbing' : 'grab'
          }}
          {...events}
        >
          <div className="wheel-inner" style={{
            background: `radial-gradient(circle at 50% 50%, ${hslToCssString(currentHsl, 0.25)} 0%, rgba(255,255,255,0.03) 70%)`
          }}>
            <svg className="wheel-ring" viewBox="0 0 100 100">
              {type === 'h' && (
                <defs>
                  <linearGradient id={`hgrad-${type}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(0,90%,60%)" />
                    <stop offset="17%" stopColor="hsl(60,90%,60%)" />
                    <stop offset="33%" stopColor="hsl(120,90%,60%)" />
                    <stop offset="50%" stopColor="hsl(180,90%,60%)" />
                    <stop offset="67%" stopColor="hsl(240,90%,60%)" />
                    <stop offset="83%" stopColor="hsl(300,90%,60%)" />
                    <stop offset="100%" stopColor="hsl(360,90%,60%)" />
                  </linearGradient>
                </defs>
              )}
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke={type === 'h' ? `url(#hgrad-${type})` : ringColor}
                strokeWidth="4"
                strokeOpacity="0.9"
              />
              <circle
                cx={dotX} cy={dotY} r="4"
                fill={ringColor}
                style={{ filter: `drop-shadow(0 0 6px ${ringColor})` }}
              />
            </svg>
          </div>
        </div>
        <div className="wheel-label">{wheelLabels[type]}</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="color-wheels-container">
      {drawWheel('h', hRender, hoverType === 'h', hRef.current.dragging)}
      {drawWheel('s', sRender, hoverType === 's', sRef.current.dragging)}
      {drawWheel('l', lRender, hoverType === 'l', lRef.current.dragging)}
    </div>
  )
}
