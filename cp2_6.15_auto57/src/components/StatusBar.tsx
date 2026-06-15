import { useGameStore } from '../store'

export default function StatusBar() {
  const minerals = useGameStore((s) => s.minerals)
  const shield = useGameStore((s) => s.shield)
  const maxShield = useGameStore((s) => s.maxShield)
  const engineLevel = useGameStore((s) => s.engineLevel)
  const shieldLevel = useGameStore((s) => s.shieldLevel)
  const laserLevel = useGameStore((s) => s.laserLevel)

  const shipLevel = Math.floor((engineLevel + shieldLevel + laserLevel) / 3)
  const shieldPct = maxShield > 0 ? (shield / maxShield) * 100 : 0

  return (
    <div style={{
      position: 'fixed',
      bottom: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      height: 60,
      minWidth: 500,
      maxWidth: '90vw',
      borderRadius: 10,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: '0 24px',
      zIndex: 40,
      boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <MineralIcon type="iron" />
        <span style={{ color: '#8d6e63', fontSize: 14, fontWeight: 600, minWidth: 24 }}>{minerals.iron}</span>
        <MineralIcon type="copper" />
        <span style={{ color: '#ff9800', fontSize: 14, fontWeight: 600, minWidth: 24 }}>{minerals.copper}</span>
        <MineralIcon type="crystal" />
        <span style={{ color: '#ce93d8', fontSize: 14, fontWeight: 600, minWidth: 24 }}>{minerals.crystal}</span>
      </div>

      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#888' }}>护盾</span>
        <div style={{
          width: 100, height: 8, borderRadius: 4,
          background: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${shieldPct}%`, height: '100%',
            borderRadius: 4,
            background: shieldPct > 50
              ? 'linear-gradient(90deg, #00e5ff, #00bcd4)'
              : shieldPct > 25
                ? 'linear-gradient(90deg, #ff9800, #f57c00)'
                : 'linear-gradient(90deg, #ff5252, #d32f2f)',
            transition: 'width 0.3s ease-out',
          }} />
        </div>
        <span style={{ fontSize: 12, color: '#aaa', minWidth: 40 }}>
          {Math.ceil(shield)}/{maxShield}
        </span>
      </div>

      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#888' }}>等级</span>
        <span style={{
          fontSize: 16, fontWeight: 700,
          background: 'linear-gradient(135deg, #00e5ff, #651fff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {shipLevel}
        </span>
      </div>
    </div>
  )
}

function MineralIcon({ type }: { type: 'iron' | 'copper' | 'crystal' }) {
  const size = 14
  const colors: Record<string, { fill: string; stroke: string }> = {
    iron: { fill: '#8d6e63', stroke: '#5d4037' },
    copper: { fill: '#ff9800', stroke: '#e65100' },
    crystal: { fill: '#ce93d8', stroke: '#7b1fa2' },
  }
  const c = colors[type]

  if (type === 'iron') {
    const points: string[] = []
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6
      points.push(`${(size / 2) + Math.cos(angle) * (size / 2)},${(size / 2) + Math.sin(angle) * (size / 2)}`)
    }
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polygon points={points.join(' ')} fill={c.fill} stroke={c.stroke} strokeWidth="1" />
      </svg>
    )
  }

  if (type === 'copper') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect x="1" y="1" width={size - 2} height={size - 2} fill={c.fill} stroke={c.stroke} strokeWidth="1" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon
        points={`${size / 2},1 ${size - 1},${size / 2} ${size / 2},${size - 1} 1,${size / 2}`}
        fill={c.fill} stroke={c.stroke} strokeWidth="1"
      />
    </svg>
  )
}
