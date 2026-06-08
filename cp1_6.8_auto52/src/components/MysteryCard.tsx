import { useState, useMemo } from 'react'

interface MysteryCardProps {
  id: string
  riddle_preview: string
  color: 'warm-yellow' | 'cyan-green' | 'light-blue'
  solved: boolean
  index: number
  onClick: (id: string, e: React.MouseEvent) => void
}

const GLOW_COLORS: Record<string, string> = {
  'warm-yellow': 'rgba(251, 191, 36, 0.35)',
  'cyan-green': 'rgba(52, 211, 153, 0.35)',
  'light-blue': 'rgba(96, 165, 250, 0.35)',
}

const TEXT_COLORS: Record<string, string> = {
  'warm-yellow': 'text-warm-yellow',
  'cyan-green': 'text-cyan-green',
  'light-blue': 'text-light-blue',
}

const FLOAT_CLASSES = ['animate-float', 'animate-float-delay', 'animate-float-slow']

export default function MysteryCard({ id, riddle_preview, color, solved, index, onClick }: MysteryCardProps) {
  const [hovered, setHovered] = useState(false)
  const floatClass = useMemo(() => FLOAT_CLASSES[index % 3], [index])
  const animDelay = useMemo(() => `${(index % 8) * 0.3}s`, [index])
  const breatheDelay = useMemo(() => `${(index % 5) * 0.5}s`, [index])

  if (solved) return null

  return (
    <div
      className={`mystery-card color-${color} ${floatClass}`}
      style={{
        animationDelay: animDelay,
        boxShadow: `0 0 18px 3px ${GLOW_COLORS[color]}`,
        animation: `${floatClass === 'animate-float-delay' ? 'float 6s ease-in-out 2s infinite' : floatClass === 'animate-float-slow' ? 'float 8s ease-in-out 1s infinite' : 'float 6s ease-in-out infinite'}, breathe 3s ease-in-out ${breatheDelay} infinite`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => onClick(id, e)}
    >
      <div className="flex flex-col items-center gap-2 min-h-[60px] justify-center">
        <div className={`text-xs font-serif ${TEXT_COLORS[color]} opacity-70 tracking-wider`}>
          谜
        </div>
        {hovered && (
          <div className="text-sm text-white/80 font-serif text-center leading-relaxed transition-opacity duration-200">
            {riddle_preview}
          </div>
        )}
        {!hovered && (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-white/30"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
