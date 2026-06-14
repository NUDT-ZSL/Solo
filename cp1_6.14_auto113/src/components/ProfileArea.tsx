import { useStore, type UserProfile } from '@/store'
import { useEffect, useState } from 'react'
import { Shield, Swords, Crown, Flame, Star } from 'lucide-react'

const EXP_PER_LEVEL = 100

const levelConfig: Record<number, { title: string; color: string; glow: string; icon: React.ReactNode }> = {
  1: { title: '新手学徒', color: '#a0a0a0', glow: '0 0 8px rgba(160,160,160,0.3)', icon: <Star size={16} /> },
  2: { title: '锻造学徒', color: '#00b894', glow: '0 0 12px rgba(0,184,148,0.4)', icon: <Shield size={16} /> },
  3: { title: '铁甲战士', color: '#6c5ce7', glow: '0 0 16px rgba(108,92,231,0.4)', icon: <Swords size={16} /> },
  4: { title: '圣殿骑士', color: '#fdcb6e', glow: '0 0 20px rgba(253,203,110,0.4)', icon: <Flame size={16} /> },
  5: { title: '传奇锻造王', color: '#e17055', glow: '0 0 24px rgba(225,112,85,0.5)', icon: <Crown size={16} /> },
}

function getPixelArt(level: number) {
  const base = [
    '  ████  ',
    ' ██████ ',
    ' ██████ ',
    '  ████  ',
    '   ██   ',
    ' ██████ ',
    '████████',
    '████████',
    ' █    █ ',
    ' █    █ ',
    ' ██  ██ ',
  ]

  const helmets: Record<number, string[]> = {
    1: [
      '        ',
      '        ',
    ],
    2: [
      '   ██   ',
      '  ████  ',
    ],
    3: [
      '  ████  ',
      ' ██████ ',
    ],
    4: [
      ' ██████ ',
      '████████',
    ],
    5: [
      ' ♛████♛ ',
      '████████',
    ],
  }

  const armors: Record<number, string[]> = {
    1: [' ██████ ', '████████'],
    2: [' ██████ ', '████████'],
    3: [' ██████ ', '████████'],
    4: [' ██████ ', '████████'],
    5: [' ██████ ', '████████'],
  }

  const helmet = helmets[level] || helmets[1]
  const armor = armors[level] || armors[1]
  const body = [...base]
  body[5] = armor[0]
  body[6] = armor[1]

  return [...helmet, ...body]
}

export default function ProfileArea() {
  const { profile, fetchProfile } = useStore()
  const [animLevel, setAnimLevel] = useState(0)

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (profile) {
      setAnimLevel(profile.level)
    }
  }, [profile])

  if (!profile) return null

  const level = Math.min(profile.level, 5)
  const config = levelConfig[level]
  const currentExp = profile.exp % EXP_PER_LEVEL
  const expPercent = (currentExp / EXP_PER_LEVEL) * 100
  const pixelArt = getPixelArt(level)

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-8 flex flex-col items-center"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, ${config.color}33 0%, transparent 50%),
                           radial-gradient(circle at 80% 50%, ${config.color}22 0%, transparent 50%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-4 w-full">
        <div className="flex items-center gap-2">
          <span style={{ color: config.color }}>{config.icon}</span>
          <h2 className="text-lg font-bold text-white tracking-wide">{config.title}</h2>
        </div>

        <div
          className="relative"
          style={{
            animation: animLevel !== profile.level ? 'levelUp 0.6s ease' : 'idle 3s ease-in-out infinite',
          }}
        >
          <div
            className="absolute -inset-4 rounded-full opacity-30 blur-xl"
            style={{ background: config.color }}
          />
          <div
            className="relative font-mono text-xs leading-[1] tracking-[0.15em] select-none"
            style={{ color: config.color, textShadow: config.glow }}
          >
            {pixelArt.map((row, i) => (
              <div key={i} className="whitespace-pre">{row}</div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>EXP {currentExp}/{EXP_PER_LEVEL}</span>
            <span>Lv.{level}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${expPercent}%`,
                background: `linear-gradient(90deg, ${config.color}, ${config.color}cc)`,
                boxShadow: config.glow,
              }}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm transition-all duration-300"
              style={{
                background: i < level ? config.color : '#2d3748',
                boxShadow: i < level ? config.glow : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
