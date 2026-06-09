import { useEffect, useRef, useState, useCallback } from 'react'
import type { Bullet } from '../App'

interface BulletWallProps {
  bullets: Bullet[]
  selectedTheme: string
  onLike: (bulletId: string) => void
  onReport: (bulletId: string) => void
}

interface RenderedBullet {
  id: string
  text: string
  color: string
  x: number
  y: number
  speed: number
  fontSize: number
  likes: number
  reported: boolean
  width: number
  createdAt: number
  bornAt: number
  trail: { x: number; y: number; alpha: number }[]
  flashAt: number
  scale: number
  lastLikeTime: number
  fadeAlpha: number
  exiting: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  phase: number
  phaseSpeed: number
}

interface ContextMenu {
  visible: boolean
  x: number
  y: number
  bulletId: string | null
}

const THEME_COLORS: Record<string, string[]> = {
  'deep-blue': ['#0a0a1a', '#0d1b3d', '#1a1a3a'],
  'dark-purple': ['#1a0a1a', '#2d1b3d', '#2a1a3a'],
  'ink-green': ['#0a1a1a', '#1b3d2d', '#1a3a2a']
}

const MAX_TRAIL_LEN = 80
const COLLISION_DIST = 30
const BULLET_PADDING_X = 20
const TOP_MARGIN = 60
const BOTTOM_MARGIN = 140

export default function BulletWall({
  bullets,
  selectedTheme,
  onLike,
  onReport
}: BulletWallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderedBulletsRef = useRef<Map<string, RenderedBullet>>(new Map())
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const themeHueRef = useRef<number>(0)
  const themeStartTimeRef = useRef<number>(Date.now())
  const contextMenuRef = useRef<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    bulletId: null
  })
  const [, forceUpdate] = useState(0)
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    bulletId: null
  })
  const longPressTimerRef = useRef<number | null>(null)
  const tapCountRef = useRef<number>(0)
  const tapTimerRef = useRef<number | null>(null)
  const lastTapBulletRef = useRef<string | null>(null)

  const getGradientColor = (
    gradientStr: string
  ): { color1: string; color2: string } => {
    const matches = gradientStr.match(/#[0-9a-fA-F]{6}/g)
    if (matches && matches.length >= 2) {
      return { color1: matches[0], color2: matches[1] }
    }
    return { color1: '#ffffff', color2: '#ffffff' }
  }

  const hexToRgb = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '')
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16)
    ]
  }

  const rgbToString = (r: number, g: number, b: number, a: number = 1) =>
    `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`

  const measureText = (ctx: CanvasRenderingContext2D, text: string, size: number) => {
    ctx.font = `bold ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
    return ctx.measureText(text).width
  }

  const initParticles = useCallback((w: number, h: number) => {
    const particles: Particle[] = []
    for (let i = 0; i < 300; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: (Math.random() - 0.5) * 0.02
      })
    }
    particlesRef.current = particles
  }, [])

  const getCurrentThemeColors = useCallback((): string[] => {
    if (selectedTheme === 'auto') {
      const elapsed = (Date.now() - themeStartTimeRef.current) / 1000
      const baseHue = themeHueRef.current
      const nextHue = baseHue + 30
      const phase = Math.min(elapsed / 2, 1)
      const smoothPhase = phase * phase * (3 - 2 * phase)

      const h1 = baseHue + smoothPhase * 30
      const h2 = baseHue + 10 + smoothPhase * 30
      const h3 = baseHue + 20 + smoothPhase * 30

      return [
        `hsl(${h1 % 360}, 70%, 7%)`,
        `hsl(${h2 % 360}, 60%, 15%)`,
        `hsl(${h3 % 360}, 50%, 10%)`
      ]
    }
    return THEME_COLORS[selectedTheme] || THEME_COLORS['deep-blue']
  }, [selectedTheme])

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedTheme === 'auto') {
        themeHueRef.current = (themeHueRef.current + 30) % 360
        themeStartTimeRef.current = Date.now()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [selectedTheme])

  const findBulletAt = useCallback((x: number, y: number): RenderedBullet | null => {
    const list = Array.from(renderedBulletsRef.current.values())
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i]
      if (b.exiting) continue
      const halfH = b.fontSize
      if (
        x >= b.x - BULLET_PADDING_X &&
        x <= b.x + b.width + BULLET_PADDING_X &&
        y >= b.y - halfH &&
        y <= b.y + halfH
      ) {
        return b
      }
    }
    return null
  }, [])

  const handleLike = useCallback(
    (bulletId: string) => {
      const b = renderedBulletsRef.current.get(bulletId)
      if (b) {
        b.lastLikeTime = performance.now()
      }
      onLike(bulletId)
    },
    [onLike]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    let width = 0
    let height = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initParticles(width, height)
    }
    resize()
    window.addEventListener('resize', resize)

    const updateBullets = () => {
      const existing = renderedBulletsRef.current
      const nowTime = performance.now()

      bullets.forEach((b) => {
        if (!existing.has(b.id)) {
          const w = measureText(ctx, b.text, b.fontSize)
          const lanes = Math.max(
            1,
            Math.floor((height - TOP_MARGIN - BOTTOM_MARGIN) / (b.fontSize * 1.5))
          )
          const laneIdx =
            b.y > 0
              ? Math.min(lanes - 1, Math.max(0, Math.floor(b.y)))
              : Math.floor(Math.random() * lanes)
          const yPos =
            TOP_MARGIN + laneIdx * b.fontSize * 1.5 + b.fontSize / 2 + 10

          existing.set(b.id, {
            id: b.id,
            text: b.text,
            color: b.color,
            x: width + 50,
            y: yPos,
            speed: -b.speed,
            fontSize: b.fontSize,
            likes: b.likes,
            reported: b.reported,
            width: w,
            createdAt: b.createdAt,
            bornAt: nowTime,
            trail: [],
            flashAt: 0,
            scale: 1,
            lastLikeTime: 0,
            fadeAlpha: 1,
            exiting: false
          })
        } else {
          const rb = existing.get(b.id)!
          rb.likes = b.likes
          rb.reported = b.reported
        }
      })
    }

    const step = (ts: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts
      const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = ts

      updateBullets()

      const bulletsArr = Array.from(renderedBulletsRef.current.values())

      for (const b of bulletsArr) {
        const age = (ts - b.bornAt) / 1000
        if (age < 0.3) {
          const t = age / 0.3
          b.scale = 0.5 + 0.5 * (1 - Math.pow(1 - t, 3))
        } else {
          b.scale = 1
        }

        if (b.flashAt > 0) {
          const flashAge = (ts - b.flashAt) / 1000
          if (flashAge < 0.1) {
            b.scale = 1.3
          } else if (flashAge < 0.15) {
            const t = (flashAge - 0.1) / 0.05
            b.scale = 1.3 - 0.3 * t
          } else {
            b.flashAt = 0
            b.scale = 1
          }
        }

        if (!b.exiting) {
          b.x += b.speed * dt

          const trailLen = Math.min(
            MAX_TRAIL_LEN,
            Math.abs(b.speed) * 0.5
          )
          b.trail.unshift({ x: b.x + b.width / 2, y: b.y, alpha: 1 })
          while (b.trail.length > trailLen / 2) {
            b.trail.pop()
          }
          for (let i = 0; i < b.trail.length; i++) {
            b.trail[i].alpha = 1 - i / b.trail.length
          }

          if (b.x + b.width < -20) {
            b.exiting = true
            b.fadeAlpha = 1
          }
        } else {
          b.fadeAlpha -= dt * 2
          if (b.fadeAlpha <= 0) {
            renderedBulletsRef.current.delete(b.id)
          }
        }
      }

      for (let i = 0; i < bulletsArr.length; i++) {
        for (let j = i + 1; j < bulletsArr.length; j++) {
          const a = bulletsArr[i]
          const b = bulletsArr[j]
          if (a.exiting || b.exiting) continue
          if (Math.abs(a.y - b.y) > a.fontSize) continue

          const aCenterX = a.x + a.width / 2
          const bCenterX = b.x + b.width / 2
          const dx = aCenterX - bCenterX
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < COLLISION_DIST && dist > 0) {
            const tmpSpeed = a.speed
            a.speed = b.speed
            b.speed = tmpSpeed

            const tmpColor = a.color
            a.color = b.color
            b.color = tmpColor

            a.flashAt = ts
            b.flashAt = ts

            const overlap = (COLLISION_DIST - dist) / 2 + 1
            const nx = dx / dist
            a.x += nx * overlap
            b.x -= nx * overlap
          }
        }
      }

      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        p.phase += p.phaseSpeed
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0
      }

      ctx.clearRect(0, 0, width, height)

      const theme = getCurrentThemeColors()
      const bgGrad = ctx.createLinearGradient(0, 0, width, height)
      bgGrad.addColorStop(0, theme[0])
      bgGrad.addColorStop(0.5, theme[1])
      bgGrad.addColorStop(1, theme[2])
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      for (const p of particlesRef.current) {
        const twinkle = 0.5 + 0.5 * Math.sin(p.phase)
        const a = p.alpha * twinkle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`
        ctx.fill()
      }

      const toRender = Array.from(renderedBulletsRef.current.values())
      toRender.sort((a, b) => a.y - b.y)

      for (const b of toRender) {
        const { color1, color2 } = getGradientColor(b.color)
        const [r1, g1, bl1] = hexToRgb(color1)
        const [r2, g2, bl2] = hexToRgb(color2)

        if (b.trail.length > 1) {
          for (let i = 1; i < b.trail.length; i++) {
            const prev = b.trail[i - 1]
            const curr = b.trail[i]
            const alpha = curr.alpha * 0.4 * b.fadeAlpha
            const tr1 = r1 * 0.6
            const tg1 = g1 * 0.6
            const tbl1 = bl1 * 0.6
            ctx.strokeStyle = rgbToString(tr1, tg1, tbl1, alpha)
            ctx.lineWidth = (b.fontSize / 20) * (1 - i / b.trail.length) * 2
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(prev.x, prev.y)
            ctx.lineTo(curr.x, curr.y)
            ctx.stroke()
          }
        }

        const centerX = b.x + b.width / 2
        const centerY = b.y

        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.scale(b.scale, b.scale)
        ctx.translate(-centerX, -centerY)

        ctx.globalAlpha = b.fadeAlpha

        if (b.reported) {
          ctx.globalAlpha *= 0.4
        }

        const textGrad = ctx.createLinearGradient(
          b.x,
          centerY - b.fontSize / 2,
          b.x + b.width,
          centerY + b.fontSize / 2
        )

        if (b.flashAt > 0) {
          textGrad.addColorStop(0, rgbToString(255, 255, 255, 1))
          textGrad.addColorStop(0.5, rgbToString(255, 255, 255, 1))
          textGrad.addColorStop(1, rgbToString(255, 255, 255, 1))
        } else {
          textGrad.addColorStop(0, rgbToString(r1, g1, bl1, 1))
          textGrad.addColorStop(1, rgbToString(r2, g2, bl2, 1))
        }

        ctx.shadowColor = b.flashAt > 0
          ? 'rgba(255,255,255,0.9)'
          : `rgba(${r1}, ${g1}, ${bl1}, 0.5)`
        ctx.shadowBlur = b.flashAt > 0 ? 20 : 10

        ctx.font = `bold ${b.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
        ctx.fillStyle = textGrad
        ctx.textBaseline = 'middle'
        ctx.fillText(b.text, b.x, centerY)

        ctx.shadowBlur = 0

        if (b.reported) {
          ctx.globalAlpha = b.fadeAlpha * 0.8
          const stripeGrad = ctx.createLinearGradient(
            b.x - 10,
            centerY - b.fontSize,
            b.x + b.width + 10,
            centerY + b.fontSize
          )
          stripeGrad.addColorStop(0, 'rgba(128, 128, 128, 0)')
          stripeGrad.addColorStop(0.5, 'rgba(128, 128, 128, 0.6)')
          stripeGrad.addColorStop(1, 'rgba(128, 128, 128, 0)')
          ctx.fillStyle = stripeGrad
          ctx.fillRect(
            b.x - 10,
            centerY - b.fontSize,
            b.width + 20,
            b.fontSize * 2
          )
          ctx.strokeStyle = 'rgba(128, 128, 128, 0.8)'
          ctx.lineWidth = 1.5
          for (
            let sx = b.x - 10;
            sx < b.x + b.width + 10;
            sx += 8
          ) {
            ctx.beginPath()
            ctx.moveTo(sx, centerY - b.fontSize)
            ctx.lineTo(sx + b.fontSize * 2, centerY + b.fontSize)
            ctx.stroke()
          }
        }

        if (b.likes > 0 || b.lastLikeTime > 0) {
          let heartScale = 1
          let heartBounce = 0
          if (b.lastLikeTime > 0) {
            const likeAge = (ts - b.lastLikeTime) / 1000
            if (likeAge < 0.2) {
              const t = likeAge / 0.2
              heartScale = 1 + 0.5 * Math.sin(t * Math.PI)
              heartBounce = -8 * Math.sin(t * Math.PI)
            }
          }

          const hx = b.x + b.width + 12
          const hy = centerY + heartBounce
          const heartSize = (b.fontSize * 0.55) * heartScale

          ctx.save()
          ctx.translate(hx, hy)
          ctx.scale(heartScale, heartScale)
          ctx.translate(-hx, -hy)

          ctx.fillStyle = 'rgba(255, 80, 100, 0.85)'
          ctx.beginPath()
          const hs = heartSize
          ctx.moveTo(hx, hy + hs * 0.3)
          ctx.bezierCurveTo(
            hx, hy,
            hx - hs * 0.6, hy,
            hx - hs * 0.6, hy + hs * 0.3
          )
          ctx.bezierCurveTo(
            hx - hs * 0.6, hy + hs * 0.55,
            hx, hy + hs * 0.8,
            hx, hy + hs
          )
          ctx.bezierCurveTo(
            hx, hy + hs * 0.8,
            hx + hs * 0.6, hy + hs * 0.55,
            hx + hs * 0.6, hy + hs * 0.3
          )
          ctx.bezierCurveTo(
            hx + hs * 0.6, hy,
            hx, hy,
            hx, hy + hs * 0.3
          )
          ctx.fill()
          ctx.restore()

          if (b.likes > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
            ctx.font = `bold ${Math.max(10, b.fontSize * 0.45)}px -apple-system, sans-serif`
            ctx.textBaseline = 'middle'
            ctx.fillText(
              String(b.likes),
              b.x + b.width + heartSize * 1.6 + 4,
              centerY + heartBounce
            )
          }
        }

        ctx.globalAlpha = 1
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [bullets, initParticles, getCurrentThemeColors])

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX || 0
      clientY = e.touches[0]?.clientY || 0
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return { x: clientX - rect.left, y: clientY - rect.top, clientX, clientY }
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    setContextMenu({ visible: false, x: 0, y: 0, bulletId: null })
  }

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e)
    const b = findBulletAt(x, y)
    if (b && !b.reported) {
      handleLike(b.id)
    }
  }

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const { x, y, clientX, clientY } = getCanvasCoords(e)
    const b = findBulletAt(x, y)
    if (b && !b.reported) {
      setContextMenu({
        visible: true,
        x: clientX,
        y: clientY,
        bulletId: b.id
      })
      forceUpdate((n) => n + 1)
    } else {
      setContextMenu({ visible: false, x: 0, y: 0, bulletId: null })
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const { x, y, clientX, clientY } = getCanvasCoords(e)
    const b = findBulletAt(x, y)

    if (b) {
      if (lastTapBulletRef.current === b.id && tapTimerRef.current) {
        clearTimeout(tapTimerRef.current)
        tapTimerRef.current = null
        lastTapBulletRef.current = null
        if (!b.reported) handleLike(b.id)
        return
      }

      lastTapBulletRef.current = b.id
      tapTimerRef.current = window.setTimeout(() => {
        tapTimerRef.current = null
        lastTapBulletRef.current = null
      }, 300)

      if (!b.reported) {
        longPressTimerRef.current = window.setTimeout(() => {
          setContextMenu({
            visible: true,
            x: clientX,
            y: clientY,
            bulletId: b.id
          })
          longPressTimerRef.current = null
        }, 500)
      }
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
      lastTapBulletRef.current = null
    }
  }

  const handleContextMenuAction = (action: 'like' | 'report') => {
    const bulletId = contextMenu.bulletId
    setContextMenu({ visible: false, x: 0, y: 0, bulletId: null })
    if (!bulletId) return
    if (action === 'like') {
      handleLike(bulletId)
    } else if (action === 'report') {
      onReport(bulletId)
    }
  }

  useEffect(() => {
    const handler = () => {
      setContextMenu({ visible: false, x: 0, y: 0, bulletId: null })
    }
    window.addEventListener('click', handler)
    window.addEventListener('scroll', handler)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('scroll', handler)
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="bullet-wall"
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onContextMenu={handleCanvasContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      />
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 9999,
            background: 'rgba(30, 30, 50, 0.98)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '10px',
            padding: '6px',
            minWidth: '120px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'rgba(255,120,140,1)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLDivElement).style.background =
                'rgba(255,255,255,0.1)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLDivElement).style.background =
                'transparent')
            }
            onClick={() => handleContextMenuAction('like')}
          >
            ❤️ 点赞
          </div>
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'rgba(255,200,100,1)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLDivElement).style.background =
                'rgba(255,255,255,0.1)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLDivElement).style.background =
                'transparent')
            }
            onClick={() => handleContextMenuAction('report')}
          >
            ⚠️ 举报
          </div>
        </div>
      )}
    </>
  )
}
