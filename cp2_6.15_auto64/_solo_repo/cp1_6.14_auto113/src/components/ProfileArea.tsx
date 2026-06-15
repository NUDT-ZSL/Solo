import { useStore } from '@/store'
import { useEffect, useState } from 'react'
import { Shield, Swords, Crown, Flame, Star } from 'lucide-react'

const EXP_PER_LEVEL = 100

interface LevelConfig {
  title: string
  color: string
  glow: string
  icon: React.ReactNode
}

const levelConfig: Record<number, LevelConfig> = {
  1: { title: '新手学徒', color: '#a0a0a0', glow: '0 0 8px rgba(160,160,160,0.3)', icon: <Star size={16} /> },
  2: { title: '锻造学徒', color: '#00b894', glow: '0 0 12px rgba(0,184,148,0.4)', icon: <Shield size={16} /> },
  3: { title: '铁甲战士', color: '#6c5ce7', glow: '0 0 16px rgba(108,92,231,0.4)', icon: <Swords size={16} /> },
  4: { title: '圣殿骑士', color: '#fdcb6e', glow: '0 0 20px rgba(253,203,110,0.4)', icon: <Flame size={16} /> },
  5: { title: '传奇锻造王', color: '#e17055', glow: '0 0 24px rgba(225,112,85,0.5)', icon: <Crown size={16} /> },
}

const PIXEL = 6

type Grid = string[]

function buildPixelGrid(level: number): { grid: Grid; cols: number; rows: number } {
  const base: Grid = [
    '........',
    '..####..',
    '.######.',
    '.######.',
    '..####..',
    '...##...',
    '.######.',
    '########',
    '########',
    '.#....#.',
    '.#....#.',
    '.##..##.',
  ]

  const helmets: Record<number, Grid> = {
    1: ['........', '........'],
    2: ['...##...', '..####..'],
    3: ['..####..', '.######.'],
    4: ['.######.', '########'],
    5: ['X######X', '########'],
  }

  const accents: Record<number, Grid> = {
    1: base,
    2: base.map((r) => r),
    3: base.map((r, i) => (i === 7 ? '##.##.##' : r)),
    4: base.map((r, i) => (i === 7 ? '##.##.##' : i === 6 ? '.#XXXX#.' : r)),
    5: base.map((r, i) => (i === 7 ? 'X####XX#' : i === 6 ? '.XXXXX..' : r)),
  }

  const helmet = helmets[level] || helmets[1]
  const body = accents[level] || base
  const grid = [...helmet, ...body]
  return { grid, cols: 8, rows: grid.length }
}

function PixelCharacter({ level, color, glow }: { level: number; color: string; glow: string }) {
  const { grid, cols, rows } = buildPixelGrid(level)
  const boxShadows: string[] = []
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '#') {
        boxShadows.push(`${x * PIXEL}px ${y * PIXEL}px 0 ${color}`)
      } else if (ch === 'X') {
        boxShadows.push(`${x * PIXEL}px ${y * PIXEL}px 0 #ffffff`)
      }
    }
  })

  return (
    <div
      className="relative"
      style={{
        width: cols * PIXEL,
        height: rows * PIXEL,
        animation: 'pixelIdle 3s ease-in-out infinite',
        filter: `drop-shadow(${glow})`,
      }}
    >
      <div
        className="absolute"
        style={{
          width: PIXEL,
          height: PIXEL,
          top: 0,
          left: 0,
          boxShadow: boxShadows.join(', '),
        }}
      />
    </div>
  )
}

export default function ProfileArea() {
  const { profile, fetchProfile } = useStore()
  const [animLevel, setAnimLevel] = useState(0)

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (profile) setAnimLevel(profile.level)
  }, [profile])

  if (!profile) return null

  const level = Math.min(profile.level, 5)
  const config = levelConfig[level]
  const currentExp = profile.exp % EXP_PER_LEVEL
  const expPercent = (currentExp / EXP_PER_LEVEL) * 100

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-8 flex flex-col items-center"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            `radial-gradient(circle at 20% 50%, ${config.color}33 0%, transparent 50%),` +
            `radial-gradient(circle at 80% 50%, ${config.color}22 0%, transparent 50%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-5 w-full">
        <div className="flex items-center gap-2">
          <span style={{ color: config.color }}>{config.icon}</span>
          <h2 className="text-lg font-bold text-white tracking-wide">{config.title}</h2>
        </div>

        <div
          className="relative py-4 px-8"
          style={{
            animation: animLevel !== profile.level ? 'levelUp 0.6s ease' : undefined,
          }}
        >
          <PixelCharacter level={level} color={config.color} glow={config.glow} />
        </div>

        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>EXP {currentExp}/{EXP_PER_LEVEL}</span>
            <span>Lv.{level}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${expPercent}%`,
                background: `linear-gradient(90deg, ${config.color}, ${config.color}cc)`,
                boxShadow: config.glow,
                transition: 'width 0.7s ease-out',
              }}
            />
          </div>
        </div>

        <div className="flex gap-2">
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
