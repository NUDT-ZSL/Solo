import { useEffect, useRef, useState, useCallback } from 'react'
import { useGameStore } from '../store'
import type { GalaxyType } from '../store'
import type { Star } from '../game/entities'
import { createStarField } from '../game/entities'

const GALAXY_INFO: { key: GalaxyType; name: string; desc: string; color1: string; color2: string }[] = [
  { key: 'safe', name: '安全星区', desc: '低风险·稳定收益', color1: '#1b5e20', color2: '#2e7d32' },
  { key: 'medium', name: '中型矿带', desc: '中等风险·丰富资源', color1: '#e65100', color2: '#f57c00' },
  { key: 'dangerous', name: '危险星云', desc: '高风险·珍稀矿物', color1: '#b71c1c', color2: '#d32f2f' },
]

export default function MainMenu() {
  const gamePhase = useGameStore((s) => s.gamePhase)
  const setGamePhase = useGameStore((s) => s.setGamePhase)
  const selectGalaxy = useGameStore((s) => s.selectGalaxy)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const animRef = useRef(0)
  const timeRef = useRef(0)

  const [haloKey, setHaloKey] = useState<number | null>(null)
  const [haloPos, setHaloPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    starsRef.current = createStarField(250, canvas.width, canvas.height)

    const ctx = canvas.getContext('2d')!
    let lastTime = performance.now()

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000
      lastTime = time
      timeRef.current += dt

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const bgGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
      )
      bgGrad.addColorStop(0, '#0d0d35')
      bgGrad.addColorStop(1, '#0a0a2e')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const star of starsRef.current) {
        const alpha = star.baseAlpha + Math.sin(timeRef.current * star.speed + star.phase) * 0.3
        ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha))
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleGalaxyClick = useCallback((galaxy: GalaxyType, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setHaloPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setHaloKey(Date.now())
    setTimeout(() => {
      selectGalaxy(galaxy)
    }, 400)
  }, [selectGalaxy])

  if (gamePhase === 'galaxy-select') {
    return (
      <div style={{ position: 'fixed', inset: 0 }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          height: '100%',
        }}>
          <h2 style={{
            fontSize: 28, fontWeight: 700, marginBottom: 36,
            background: 'linear-gradient(135deg, #00e5ff, #651fff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            选择星系
          </h2>

          <div style={{ display: 'flex', gap: 24 }}>
            {GALAXY_INFO.map((g) => (
              <div
                key={g.key}
                onClick={(e) => handleGalaxyClick(g.key, e)}
                style={{
                  position: 'relative',
                  width: 220, height: 140,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${g.color1}, ${g.color2})`,
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease-out',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${g.color1}66`
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)'
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                  {g.name}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                  {g.desc}
                </div>

                {haloKey !== null && (
                  <div style={{
                    position: 'absolute',
                    left: haloPos.x, top: haloPos.y,
                    width: 60, height: 60,
                    marginLeft: -30, marginTop: -30,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent)',
                    animation: 'haloExpand 0.5s ease-out forwards',
                    pointerEvents: 'none',
                  }} />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => setGamePhase('menu')}
            style={{
              marginTop: 32, padding: '10px 28',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8, color: '#aaa',
              fontSize: 14, cursor: 'pointer',
              transition: 'all 0.3s ease-out',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
            }}
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%',
      }}>
        <h1 style={{
          fontSize: 48, fontWeight: 800, marginBottom: 8,
          background: 'linear-gradient(135deg, #00e5ff, #651fff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: 4,
        }}>
          太空采矿模拟器
        </h1>
        <p style={{
          fontSize: 16, color: 'rgba(255,255,255,0.5)',
          marginBottom: 48, letterSpacing: 2,
        }}>
          SPACE MINING SIMULATOR
        </p>

        <button
          onClick={() => setGamePhase('galaxy-select')}
          style={{
            padding: '14px 48px', border: 'none',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1a237e, #283593)',
            color: '#e0e0e0', fontSize: 18, fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s ease-out',
            boxShadow: '0 4px 20px rgba(26,35,126,0.4)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.filter = 'brightness(1.2)'
            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 30px rgba(26,35,126,0.6)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'
            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(26,35,126,0.4)'
          }}
        >
          开始新游戏
        </button>

        <div style={{
          marginTop: 40, fontSize: 12,
          color: 'rgba(255,255,255,0.25)',
          textAlign: 'center', lineHeight: 1.8,
        }}>
          WASD 移动 · 鼠标瞄准 · 左键射击 · B 升级
        </div>
      </div>
    </div>
  )
}
