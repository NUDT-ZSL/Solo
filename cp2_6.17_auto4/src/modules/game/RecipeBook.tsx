import recipes from '../data/recipes.json'
import { getMaterialById, type Recipe } from './reactionEngine'

interface Props {
  unlocked: Set<string>
  onClose: () => void
}

export default function RecipeBook({ unlocked, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 680,
          maxHeight: '85vh',
          borderRadius: 16,
          background: '#1e293b',
          border: '3px solid #b8860b',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleIn 0.3s ease',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            paddingBottom: 12,
            borderBottom: '1px solid #334155',
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: '#ffd700',
              fontWeight: 'bold',
              textShadow: '0 0 12px rgba(255, 215, 0, 0.5)',
            }}
          >
            📖 炼金配方图鉴
          </div>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>
            已解锁 {unlocked.size} / {recipes.length}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
            padding: 4,
          }}
        >
          {(recipes as Recipe[]).map((recipe) => {
            const isUnlocked = unlocked.has(recipe.id)
            return (
              <div
                key={recipe.id}
                style={{
                  width: 140,
                  height: 180,
                  borderRadius: 12,
                  background: '#1e293b',
                  border: '1px solid #334155',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: isUnlocked ? 'flex-start' : 'center',
                  transition: 'all 0.25s ease',
                  boxShadow: isUnlocked ? '0 0 8px rgba(184, 134, 11, 0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (isUnlocked) {
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = '#ffd700'
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow =
                      '0 0 12px rgba(255, 215, 0, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = '#334155'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = isUnlocked
                    ? '0 0 8px rgba(184, 134, 11, 0.3)'
                    : 'none'
                }}
              >
                {!isUnlocked ? (
                  <>
                    <div style={{ fontSize: 48, color: '#475569', marginBottom: 8 }}>
                      🔒
                    </div>
                    <div style={{ color: '#475569', fontSize: 28, fontWeight: 'bold' }}>
                      ???
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 8 }}>
                      尚未发现
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        gap: 4,
                        marginBottom: 8,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      }}
                    >
                      {recipe.materials.map((mid) => {
                        const mat = getMaterialById(mid)
                        if (!mat) return null
                        return (
                          <div
                            key={mid}
                            title={mat.name}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              background: mat.color,
                              border: '1px solid #b8860b',
                            }}
                          />
                        )
                      })}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        color: '#ffd700',
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}
                    >
                      {recipe.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#a5d8ff',
                        fontFamily: 'monospace',
                        margin: '4px 0 6px',
                      }}
                    >
                      {recipe.formula}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#94a3b8',
                        textAlign: 'center',
                        lineHeight: 1.4,
                      }}
                    >
                      {recipe.minTemp}°C ~ {recipe.maxTemp}°C
                      {recipe.requireStir ? ' + 搅拌' : ''}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 32px',
              borderRadius: 8,
              background: '#b8860b',
              color: '#ffffff',
              border: 'none',
              fontSize: 15,
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = '#ffd700')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = '#b8860b')
            }
          >
            返回实验台
          </button>
        </div>
      </div>
    </div>
  )
}
