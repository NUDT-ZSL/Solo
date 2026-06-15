import React, { useEffect, useRef } from 'react'

interface SandTimerProps {
  size?: number
  unlockAt: string
}

function Particle({ delay, x, duration }: { delay: number; x: number; duration: number }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: 3 + Math.random() * 3,
        height: 3 + Math.random() * 3,
        left: `${x}%`,
        background: `radial-gradient(circle, rgba(251,191,36,0.9), rgba(167,139,250,0.4))`,
        boxShadow: '0 0 6px rgba(251,191,36,0.6), 0 0 12px rgba(167,139,250,0.3)',
        animation: `particleFall ${duration}s ease-in ${delay}s infinite`,
        opacity: 0,
      }}
    />
  )
}

export default function SandTimer({ size = 200, unlockAt }: SandTimerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }[] = []
    let animId: number

    const resize = () => {
      canvas.width = size * 2
      canvas.height = size * 2
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
    }
    resize()

    const spawn = () => {
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const angle = Math.random() * Math.PI * 2
      const radius = 30 + Math.random() * 50
      particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        life: 0,
        maxLife: 40 + Math.random() * 60,
        size: 1 + Math.random() * 2.5,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (Math.random() < 0.3) spawn()

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life++
        const progress = p.life / p.maxLife
        const alpha = progress < 0.2 ? progress * 5 : 1 - (progress - 0.2) / 0.8

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        gradient.addColorStop(0, `rgba(251, 191, 36, ${alpha * 0.8})`)
        gradient.addColorStop(0.4, `rgba(167, 139, 250, ${alpha * 0.5})`)
        gradient.addColorStop(1, `rgba(236, 72, 153, 0)`)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
        ctx.fill()

        if (p.life >= p.maxLife) {
          particles.splice(i, 1)
        }
      }

      animId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [size])

  const cssParticles = Array.from({ length: 12 }, (_, i) => ({
    delay: i * 0.4,
    x: 30 + Math.random() * 40,
    duration: 2 + Math.random() * 2,
  }))

  return (
    <div className="flex flex-col items-center gap-6">
      <style>{`
        @keyframes hourglassRotate {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(0deg); }
          26% { transform: rotate(180deg); }
          50% { transform: rotate(180deg); }
          51% { transform: rotate(360deg); }
          75% { transform: rotate(360deg); }
          76% { transform: rotate(540deg); }
          100% { transform: rotate(540deg); }
        }

        @keyframes sandFall {
          0% { transform: scaleY(1); }
          50% { transform: scaleY(0.3); }
          51% { transform: scaleY(1); }
          100% { transform: scaleY(0.3); }
        }

        @keyframes sandFallBottom {
          0% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
          51% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }

        @keyframes sandStream {
          0%, 100% { opacity: 0.8; height: 30%; }
          50% { opacity: 0.6; height: 25%; }
          51% { opacity: 0.8; height: 30%; }
        }

        @keyframes particleFall {
          0% { top: 45%; opacity: 0; transform: translateX(0) scale(1); }
          10% { opacity: 1; }
          80% { opacity: 0.6; }
          100% { top: 85%; opacity: 0; transform: translateX(${Math.random() > 0.5 ? '' : '-'}${5 + Math.random() * 10}px) scale(0.3); }
        }

        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(167,139,250,0.4)) drop-shadow(0 0 20px rgba(236,72,153,0.2)); }
          50% { filter: drop-shadow(0 0 16px rgba(167,139,250,0.6)) drop-shadow(0 0 40px rgba(236,72,153,0.4)); }
        }

        .hourglass-container {
          animation: glowPulse 3s ease-in-out infinite;
        }

        .hourglass-body {
          animation: hourglassRotate 12s ease-in-out infinite;
          transform-origin: center center;
        }

        .sand-top {
          animation: sandFall 6s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .sand-bottom {
          animation: sandFallBottom 6s ease-in-out infinite;
          transform-origin: center top;
        }

        .sand-stream {
          animation: sandStream 6s ease-in-out infinite;
        }
      `}</style>

      <div className="relative hourglass-container" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-0"
          style={{ width: size, height: size }}
        />

        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="hourglass-body" style={{ width: size * 0.4, height: size * 0.7 }}>
            <svg viewBox="0 0 100 180" width="100%" height="100%" fill="none">
              <defs>
                <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(167,139,250,0.15)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
                  <stop offset="100%" stopColor="rgba(236,72,153,0.12)" />
                </linearGradient>
                <linearGradient id="sandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
                <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(167,139,250,0.6)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                  <stop offset="100%" stopColor="rgba(236,72,153,0.6)" />
                </linearGradient>
              </defs>

              <rect x="10" y="4" width="80" height="6" rx="3" fill="url(#frameGrad)" />
              <rect x="10" y="170" width="80" height="6" rx="3" fill="url(#frameGrad)" />

              <path
                d="M 18 14 L 82 14 L 55 80 L 55 100 L 82 166 L 18 166 L 45 100 L 45 80 Z"
                fill="url(#glassGrad)"
                stroke="rgba(167,139,250,0.2)"
                strokeWidth="0.5"
              />

              <clipPath id="topHalf">
                <rect x="0" y="10" width="100" height="80" />
              </clipPath>
              <clipPath id="bottomHalf">
                <rect x="0" y="90" width="100" height="85" />
              </clipPath>

              <path
                d="M 22 18 L 78 18 L 54 76 L 46 76 Z"
                fill="url(#sandGrad)"
                opacity="0.7"
                className="sand-top"
                clipPath="url(#topHalf)"
              />

              <rect
                x="48.5"
                y="76"
                width="3"
                height="30%"
                fill="url(#sandGrad)"
                opacity="0.6"
                className="sand-stream"
                rx="1.5"
              />

              <path
                d="M 22 162 L 78 162 L 54 106 L 46 106 Z"
                fill="url(#sandGrad)"
                opacity="0.7"
                className="sand-bottom"
                clipPath="url(#bottomHalf)"
              />

              <path
                d="M 18 14 L 82 14 L 55 80 L 55 100 L 82 166 L 18 166 L 45 100 L 45 80 Z"
                fill="none"
                stroke="url(#frameGrad)"
                strokeWidth="1"
                opacity="0.4"
              />
            </svg>
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none z-20">
          {cssParticles.map((p, i) => (
            <Particle key={i} delay={p.delay} x={p.x} duration={p.duration} />
          ))}
        </div>
      </div>

      <p className="text-sm text-[var(--text-secondary)] font-serif text-center countdown-pulse">
        ⏳ 时光流转中，信件等待解锁...
      </p>
    </div>
  )
}
