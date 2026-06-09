import React, { useEffect, useRef, useState } from 'react'
import { HSL, hslToHex, hslToRgb, hslToString, rgbToString } from './utils/color'

interface Props {
  hsl: HSL
  onColorDisplayRef?: (el: HTMLDivElement | null) => void
}

export default function ColorDisplay({ hsl, onColorDisplayRef }: Props) {
  const displayRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [animState, setAnimState] = useState<'idle' | 'press' | 'flash'>('idle')

  const hex = hslToHex(hsl)
  const rgb = hslToRgb(hsl)
  const hslStr = hslToString(hsl)
  const rgbStr = rgbToString(rgb)

  useEffect(() => {
    if (onColorDisplayRef) onColorDisplayRef(displayRef.current)
  }, [onColorDisplayRef])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hex)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = hex
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setAnimState('press')

    let rafId = 0
    const startTs = performance.now()
    const flashUntil = startTs + 150
    const pressUntil = startTs + 300

    const loop = (ts: number) => {
      if (ts < flashUntil) {
        setAnimState('flash')
      } else if (ts < pressUntil) {
        setAnimState('press')
      } else {
        setAnimState('idle')
        setTimeout(() => setCopied(false), 1200)
        return
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
  }

  const buttonScale = animState === 'press'
    ? 'scale(0.85)'
    : animState === 'flash'
      ? 'scale(1.0)'
      : 'scale(1.0)'
  const buttonBg = animState === 'flash'
    ? 'rgba(255,255,255,0.95)'
    : 'rgba(255,255,255,0.08)'

  return (
    <div className="color-display" ref={displayRef}>
      <div
        className="color-swatch"
        style={{
          background: `hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`,
          boxShadow: `0 0 40px hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.4), inset 0 0 30px rgba(255,255,255,0.08)`
        }}
      />
      <div className="color-values">
        <div className="color-line"><span className="color-label">HEX</span><span className="color-num">{hex}</span></div>
        <div className="color-line"><span className="color-label">HSL</span><span className="color-num">{hslStr}</span></div>
        <div className="color-line"><span className="color-label">RGB</span><span className="color-num">{rgbStr}</span></div>
      </div>
      <button
        className={`copy-btn ${copied ? 'copied' : ''}`}
        onClick={handleCopy}
        style={{
          transform: buttonScale,
          background: buttonBg,
          transition: 'transform 0.08s ease-out, background 0.15s ease, filter 0.2s ease'
        }}
      >
        {copied ? '已复制!' : '复制 HEX 值'}
      </button>
    </div>
  )
}
