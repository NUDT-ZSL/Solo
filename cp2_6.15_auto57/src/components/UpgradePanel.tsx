import { useGameStore } from '../store'
import { getUpgradeCost } from '../game/entities'

const UPGRADE_INFO = [
  {
    type: 'engine' as const,
    name: '引擎',
    icon: '⚡',
    desc: '提升飞船速度',
  },
  {
    type: 'shield' as const,
    name: '护盾',
    icon: '🛡',
    desc: '增强防护能力',
  },
  {
    type: 'laser' as const,
    name: '激光',
    icon: '🔥',
    desc: '增强激光功率',
  },
]

export default function UpgradePanel() {
  const minerals = useGameStore((s) => s.minerals)
  const engineLevel = useGameStore((s) => s.engineLevel)
  const shieldLevel = useGameStore((s) => s.shieldLevel)
  const laserLevel = useGameStore((s) => s.laserLevel)
  const upgradeFlash = useGameStore((s) => s.upgradeFlash)
  const upgradeEngine = useGameStore((s) => s.upgradeEngine)
  const upgradeShield = useGameStore((s) => s.upgradeShield)
  const upgradeLaser = useGameStore((s) => s.upgradeLaser)
  const spendMinerals = useGameStore((s) => s.spendMinerals)
  const closeUpgradePanel = useGameStore((s) => s.closeUpgradePanel)

  const levels = { engine: engineLevel, shield: shieldLevel, laser: laserLevel }
  const upgradeFns = { engine: upgradeEngine, shield: upgradeShield, laser: upgradeLaser }

  const handleUpgrade = (type: 'engine' | 'shield' | 'laser') => {
    const level = levels[type]
    if (level >= 5) return
    const cost = getUpgradeCost(type, level)
    if (minerals.iron < cost.iron || minerals.copper < cost.copper || minerals.crystal < cost.crystal) return
    spendMinerals(cost)
    upgradeFns[type]()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '10vh',
      zIndex: 50,
      animation: 'fadeIn 0.3s ease-out',
    }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeUpgradePanel()
      }}
    >
      <div style={{
        width: 400, height: 320,
        borderRadius: 16,
        background: '#1a1a2e',
        boxShadow: '0 0 30px rgba(0,0,0,0.5), inset 0 0 30px rgba(101,31,255,0.05)',
        padding: '24px 20px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
      }}>
        <h3 style={{
          fontSize: 20, fontWeight: 700, marginBottom: 20,
          background: 'linear-gradient(135deg, #00e5ff, #651fff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          飞船升级
        </h3>

        <div style={{ display: 'flex', gap: 12 }}>
          {UPGRADE_INFO.map((info) => {
            const level = levels[info.type]
            const cost = getUpgradeCost(info.type, level)
            const canAfford = minerals.iron >= cost.iron && minerals.copper >= cost.copper && minerals.crystal >= cost.crystal
            const isMaxed = level >= 5
            const isFlashing = upgradeFlash === info.type

            return (
              <div
                key={info.type}
                style={{
                  width: 120, height: 160,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 6,
                  animation: isFlashing ? 'goldFlash 0.5s ease-out' : undefined,
                }}
              >
                <div style={{ fontSize: 28 }}>{info.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{info.name}</div>

                <div style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} style={{
                      fontSize: 10,
                      color: i <= level ? '#ffd740' : 'rgba(255,255,255,0.15)',
                    }}>★</span>
                  ))}
                </div>

                {!isMaxed ? (
                  <div style={{ fontSize: 10, color: '#888', textAlign: 'center', lineHeight: 1.4 }}>
                    <span style={{ color: '#8d6e63' }}>铁{cost.iron}</span>{' '}
                    <span style={{ color: '#ff9800' }}>铜{cost.copper}</span>{' '}
                    <span style={{ color: '#ce93d8' }}>晶{cost.crystal}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: '#ffd740' }}>MAX</div>
                )}

                <button
                  onClick={() => handleUpgrade(info.type)}
                  disabled={!canAfford || isMaxed}
                  style={{
                    marginTop: 4, padding: '4px 16px',
                    border: 'none', borderRadius: 6,
                    background: (!canAfford || isMaxed) ? '#3a3a3a' : '#00bcd4',
                    color: (!canAfford || isMaxed) ? '#666' : '#fff',
                    fontSize: 12, fontWeight: 600,
                    cursor: (!canAfford || isMaxed) ? 'not-allowed' : 'pointer',
                    opacity: (!canAfford || isMaxed) ? 0.6 : 1,
                    transition: 'all 0.2s ease-out',
                    filter: (!canAfford || isMaxed) ? 'grayscale(0.5)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (canAfford && !isMaxed) {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0,188,212,0.5)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  {isMaxed ? '已满级' : '升级'}
                </button>
              </div>
            )
          })}
        </div>

        <div style={{
          marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.35)',
        }}>
          按 B 键关闭
        </div>
      </div>
    </div>
  )
}
