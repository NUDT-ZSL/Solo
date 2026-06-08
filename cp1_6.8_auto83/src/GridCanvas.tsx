import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useIdeaStore, getGridColumns, type Idea, type FusionAnimation } from './IdeaEngine'
import { IdeaModal, PublishModal } from './IdeaModal'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  color: string
}

const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = ['#FF2D95', '#00D4FF', '#39FF14']
    const count = window.innerWidth < 768 ? 30 : window.innerWidth < 1024 ? 50 : 80

    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha * 0.15
        ctx.fill()
      }
      ctx.globalAlpha = 1
      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}

const IdeaCard: React.FC<{
  idea: Idea
  index: number
  onClick: (idea: Idea, el: HTMLDivElement) => void
  isFusing: boolean
  fusionProgress: number
}> = ({ idea, index, onClick, isFusing, fusionProgress }) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const scale = isFusing ? 1 + 0.3 * fusionProgress : 1
  const glowExtra = isFusing ? fusionProgress * 0.5 : 0

  return (
    <div
      ref={cardRef}
      className="idea-card cursor-pointer group relative rounded-2xl border border-white/10 overflow-hidden transition-transform duration-300 hover:scale-105 active:scale-95"
      style={{
        background: `linear-gradient(135deg, ${idea.color}18, ${idea.color}08)`,
        backdropFilter: 'blur(16px)',
        boxShadow: `0 0 ${20 + glowExtra * 30}px ${idea.color}${Math.round(15 + glowExtra * 25).toString(16).padStart(2, '0')}`,
        transform: `scale(${scale})`,
        animationDelay: `${index * 0.1}s`,
        animation: 'float 3s ease-in-out infinite',
        animationDelay: `${index * 0.3}s`,
      }}
      onClick={() => {
        if (cardRef.current) onClick(idea, cardRef.current)
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${idea.color}25, transparent)`,
        }}
      />
      <div className="relative p-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: idea.color,
              boxShadow: `0 0 8px ${idea.color}80`,
            }}
          />
          {idea.inspiredCount > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                background: `${idea.color}20`,
                color: idea.color,
              }}
            >
              {idea.inspiredCount} 次启发
            </span>
          )}
        </div>
        <p className="text-white/80 text-sm leading-relaxed line-clamp-2">
          {idea.content}
        </p>
      </div>
    </div>
  )
}

const FusionLine: React.FC<{ animation: FusionAnimation }> = ({ animation }) => {
  const { fromPos, toPos, progress, color } = animation
  const currentX = fromPos.x + (toPos.x - fromPos.x) * easeOutCubic(progress)
  const currentY = fromPos.y + (toPos.y - fromPos.y) * easeOutCubic(progress)

  return (
    <svg
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 30, width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id="fusionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} stopOpacity="0.3" />
        </linearGradient>
        <filter id="fusionGlow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <line
        x1={fromPos.x}
        y1={fromPos.y}
        x2={currentX}
        y2={currentY}
        stroke={`url(#fusionGrad)`}
        strokeWidth="3"
        filter="url(#fusionGlow)"
        strokeLinecap="round"
      />
      <circle
        cx={currentX}
        cy={currentY}
        r="6"
        fill={color}
        filter="url(#fusionGlow)"
        opacity="0.9"
      />
      <circle
        cx={currentX}
        cy={currentY}
        r="12"
        fill={color}
        opacity="0.3"
      />
    </svg>
  )
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export const GridCanvas: React.FC = () => {
  const ideas = useIdeaStore((s) => s.ideas)
  const selectedIdea = useIdeaStore((s) => s.selectedIdea)
  const showPublishModal = useIdeaStore((s) => s.showPublishModal)
  const fusionAnimation = useIdeaStore((s) => s.fusionAnimation)
  const fetchIdeas = useIdeaStore((s) => s.fetchIdeas)
  const selectIdea = useIdeaStore((s) => s.selectIdea)
  const inspireIdea = useIdeaStore((s) => s.inspireIdea)
  const [columns, setColumns] = useState(getGridColumns)

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  useEffect(() => {
    const handleResize = () => setColumns(getGridColumns())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleCardClick = useCallback(
    (idea: Idea, el: HTMLDivElement) => {
      selectIdea(idea)
    },
    [selectIdea]
  )

  const handleInspire = useCallback(
    (targetIdea: Idea) => {
      const sourceIdea = ideas.find((i) => i.id !== targetIdea.id)
      if (!sourceIdea) return

      const sourceEl = document.querySelector(`[data-idea-id="${sourceIdea.id}"]`)
      const targetEl = document.querySelector(`[data-idea-id="${targetIdea.id}"]`)

      const fromPos = sourceEl
        ? {
            x: sourceEl.getBoundingClientRect().left + sourceEl.getBoundingClientRect().width / 2,
            y: sourceEl.getBoundingClientRect().top + sourceEl.getBoundingClientRect().height / 2,
          }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 }

      const toPos = targetEl
        ? {
            x: targetEl.getBoundingClientRect().left + targetEl.getBoundingClientRect().width / 2,
            y: targetEl.getBoundingClientRect().top + targetEl.getBoundingClientRect().height / 2,
          }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 }

      inspireIdea(sourceIdea.id, targetIdea.id, fromPos, toPos, sourceIdea.color)
    },
    [ideas, inspireIdea]
  )

  return (
    <div className="min-h-screen relative" style={{ paddingBottom: '80px' }}>
      <ParticleCanvas />

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-6 pb-4">
        <header className="text-center mb-8">
          <h1
            className="text-3xl md:text-4xl font-bold tracking-wider mb-2"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              background: 'linear-gradient(135deg, #FF2D95, #00D4FF, #39FF14)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.3))',
            }}
          >
            灵感网格
          </h1>
          <p className="text-white/30 text-sm">在碰撞中绽放灵感的火花</p>
        </header>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {ideas.map((idea, index) => {
            const isFusing = fusionAnimation?.toId === idea.id
            return (
              <div key={idea.id} data-idea-id={idea.id}>
                <IdeaCard
                  idea={idea}
                  index={index}
                  onClick={handleCardClick}
                  isFusing={isFusing}
                  fusionProgress={isFusing ? fusionAnimation!.progress : 0}
                />
              </div>
            )
          })}
        </div>

        {ideas.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/20 text-lg">还没有创意，点击下方发布第一个灵感吧</p>
          </div>
        )}
      </div>

      {fusionAnimation && <FusionLine animation={fusionAnimation} />}

      {selectedIdea && (
        <IdeaModal
          idea={selectedIdea}
          onClose={() => selectIdea(null)}
          onInspire={handleInspire}
        />
      )}

      {showPublishModal && <PublishModal onClose={() => {}} />}
    </div>
  )
}

const BADGE_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32', '#00D4FF', '#39FF14', '#FF2D95', '#BF40BF', '#FF6B35', '#00FF7F', '#7DF9FF']

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<Idea[]>([])
  const getLeaderboard = useIdeaStore((s) => s.getLeaderboard)

  useEffect(() => {
    getLeaderboard().then(setLeaderboard)
  }, [getLeaderboard])

  return (
    <div className="min-h-screen relative" style={{ paddingBottom: '80px' }}>
      <ParticleCanvas />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-4">
        <header className="text-center mb-8">
          <h2
            className="text-2xl md:text-3xl font-bold tracking-wider mb-2"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              background: 'linear-gradient(135deg, #39FF14, #00D4FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 15px rgba(57,255,20,0.3))',
            }}
          >
            热度榜
          </h2>
          <p className="text-white/30 text-sm">最受启发的创意火花</p>
        </header>

        <div className="space-y-3">
          {leaderboard.map((idea, index) => {
            const badgeColor = BADGE_COLORS[index] || '#00D4FF'
            const isTop3 = index < 3
            return (
              <div
                key={idea.id}
                className="flex items-center gap-4 rounded-2xl border border-white/10 p-4 transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${idea.color}12, ${idea.color}06)`,
                  backdropFilter: 'blur(12px)',
                  boxShadow: isTop3
                    ? `0 0 25px ${idea.color}15`
                    : 'none',
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{
                    background: isTop3 ? `${badgeColor}25` : 'rgba(255,255,255,0.05)',
                    color: isTop3 ? badgeColor : 'rgba(255,255,255,0.4)',
                    border: isTop3 ? `1px solid ${badgeColor}40` : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: isTop3 ? `0 0 12px ${badgeColor}30` : 'none',
                  }}
                >
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm truncate">{idea.content}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: idea.color,
                      boxShadow: `0 0 6px ${idea.color}60`,
                    }}
                  />
                  <span className="text-xs" style={{ color: `${idea.color}CC` }}>
                    {idea.inspiredCount}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {leaderboard.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/20 text-lg">暂无数据</p>
          </div>
        )}
      </div>
    </div>
  )
}
