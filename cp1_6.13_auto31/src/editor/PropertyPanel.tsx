import { useLevelStore } from '@/store/useLevelStore'
import { type EnemyEntity, isEnemyElement, GRID_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/types'

function PathPointEditor({
  pathPoints,
  onChange,
}: {
  pathPoints: { x: number; y: number }[]
  onChange: (pts: { x: number; y: number }[]) => void
}) {
  const addPoint = () => {
    if (pathPoints.length >= 4) return
    const last = pathPoints[pathPoints.length - 1]
    onChange([...pathPoints, { x: last.x + 120, y: last.y }])
  }

  const removePoint = () => {
    if (pathPoints.length <= 2) return
    onChange(pathPoints.slice(0, -1))
  }

  const updatePoint = (index: number, axis: 'x' | 'y', value: number) => {
    const newPts = [...pathPoints]
    newPts[index] = { ...newPts[index], [axis]: value }
    onChange(newPts)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 12,
          color: '#555',
          fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
        }}>
          路径点数量: {pathPoints.length}
        </span>
        <button
          onClick={addPoint}
          disabled={pathPoints.length >= 4}
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #ddd',
            background: pathPoints.length >= 4 ? '#f5f5f5' : '#fff',
            color: pathPoints.length >= 4 ? '#aaa' : '#333',
            cursor: pathPoints.length >= 4 ? 'not-allowed' : 'pointer',
            fontSize: 12,
            transition: 'all 0.2s',
          }}
        >
          +
        </button>
        <button
          onClick={removePoint}
          disabled={pathPoints.length <= 2}
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #ddd',
            background: pathPoints.length <= 2 ? '#f5f5f5' : '#fff',
            color: pathPoints.length <= 2 ? '#aaa' : '#333',
            cursor: pathPoints.length <= 2 ? 'not-allowed' : 'pointer',
            fontSize: 12,
            transition: 'all 0.2s',
          }}
        >
          −
        </button>
      </div>
      {pathPoints.map((pt, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#888', width: 20 }}>P{i + 1}</span>
          <label style={{ fontSize: 11, color: '#666' }}>X</label>
          <input
            type="number"
            value={pt.x}
            onChange={e => updatePoint(i, 'x', Number(e.target.value))}
            min={0}
            max={CANVAS_WIDTH}
            step={GRID_SIZE}
            style={{
              width: 64,
              padding: '3px 6px',
              borderRadius: 4,
              border: '1px solid #ddd',
              fontSize: 12,
              transition: 'all 0.2s',
            }}
          />
          <label style={{ fontSize: 11, color: '#666' }}>Y</label>
          <input
            type="number"
            value={pt.y}
            onChange={e => updatePoint(i, 'y', Number(e.target.value))}
            min={0}
            max={CANVAS_HEIGHT}
            step={GRID_SIZE}
            style={{
              width: 64,
              padding: '3px 6px',
              borderRadius: 4,
              border: '1px solid #ddd',
              fontSize: 12,
              transition: 'all 0.2s',
            }}
          />
        </div>
      ))}
    </div>
  )
}

export default function PropertyPanel() {
  const elements = useLevelStore(s => s.elements)
  const selectedId = useLevelStore(s => s.selectedId)
  const updateEnemy = useLevelStore(s => s.updateEnemy)
  const removeElement = useLevelStore(s => s.removeElement)
  const rightPanelCollapsed = useLevelStore(s => s.rightPanelCollapsed)
  const setRightPanelCollapsed = useLevelStore(s => s.setRightPanelCollapsed)

  const selectedElement = selectedId ? elements.find(el => el.id === selectedId) : null
  const isSelectedEnemy = selectedElement ? isEnemyElement(selectedElement) : false
  const enemyElement = isSelectedEnemy ? (selectedElement as EnemyEntity) : null

  if (rightPanelCollapsed) {
    return (
      <div style={{
        width: 48,
        background: '#ffffff',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 8,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}>
        <button
          onClick={() => setRightPanelCollapsed(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 18,
            padding: 4,
          }}
          title="展开属性面板"
        >
          ◀
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: 260,
      background: '#ffffff',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      transition: 'all 0.2s',
      overflowY: 'auto',
      fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#1a1a2e',
        }}>
          属性面板
        </span>
        <button
          onClick={() => setRightPanelCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 14,
            padding: 2,
          }}
          title="折叠面板"
        >
          ▶
        </button>
      </div>

      {!selectedElement ? (
        <div style={{
          color: '#999',
          fontSize: 13,
          textAlign: 'center' as const,
          padding: '24px 0',
        }}>
          点击画布中的元素查看属性
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#f8f8fa',
            borderRadius: 8,
          }}>
            <span style={{ fontSize: 16 }}>
              {selectedElement.type === 'slime' ? '●' :
               selectedElement.type === 'dragon' ? '◆' :
               selectedElement.type === 'ground' ? '▬' :
               selectedElement.type === 'movingPlatform' ? '◄►' :
               selectedElement.type === 'spike' ? '▲' : '⚑'}
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#333',
            }}>
              {selectedElement.type === 'ground' ? '地面块' :
               selectedElement.type === 'movingPlatform' ? '移动平台' :
               selectedElement.type === 'spike' ? '尖刺' :
               selectedElement.type === 'flag' ? '终点旗' :
               selectedElement.type === 'slime' ? '史莱姆' : '飞龙'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#666' }}>位置 X</label>
            <input
              type="number"
              value={selectedElement.x}
              readOnly
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #e5e5e5',
                fontSize: 13,
                background: '#f8f8fa',
                color: '#333',
              }}
            />
            <label style={{ fontSize: 12, color: '#666' }}>位置 Y</label>
            <input
              type="number"
              value={selectedElement.y}
              readOnly
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #e5e5e5',
                fontSize: 13,
                background: '#f8f8fa',
                color: '#333',
              }}
            />
          </div>

          {isSelectedEnemy && enemyElement && (
            <>
              <div style={{ height: 1, background: '#eee' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#444' }}>
                  移动路径
                </label>
                <PathPointEditor
                  pathPoints={enemyElement.pathPoints}
                  onChange={(pts) => updateEnemy(enemyElement.id, { pathPoints: pts })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#444' }}>
                  移动速度: {enemyElement.speed.toFixed(1)} px/帧
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={enemyElement.speed}
                  onChange={e => updateEnemy(enemyElement.id, { speed: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    accentColor: '#3b82f6',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#444' }}>
                  巡逻间隔（秒）
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={enemyElement.patrolInterval}
                  onChange={e => updateEnemy(enemyElement.id, { patrolInterval: Number(e.target.value) })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #e5e5e5',
                    fontSize: 13,
                    color: '#333',
                    transition: 'all 0.2s',
                  }}
                />
              </div>
            </>
          )}

          <button
            onClick={() => {
              removeElement(selectedElement.id)
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #fecaca',
              background: '#fff5f5',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fee2e2'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#fff5f5'
            }}
          >
            删除元素
          </button>
        </>
      )}
    </div>
  )
}
