import { useState } from 'react'
import { useLevelStore } from '@/store/useLevelStore'
import { type EnemyEntity, isEnemyElement, GRID_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/types'

function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE
}

function PathPointEditor({
  enemyId,
  enemyElement,
  pathPoints,
  onChange,
}: {
  enemyId: string
  enemyElement: EnemyEntity
  pathPoints: { x: number; y: number }[]
  onChange: (pts: { x: number; y: number }[]) => void
}) {
  const updateEnemy = useLevelStore(s => s.updateEnemy)
  const [pickingIndex, setPickingIndex] = useState<number | null>(null)

  const addPoint = () => {
    if (pathPoints.length >= 4) return
    const last = pathPoints[pathPoints.length - 1]
    const newX = snapToGrid(last.x + 120)
    const newY = last.y
    const newPts = [...pathPoints, { x: newX, y: newY }]
    onChange(newPts)
  }

  const removePoint = () => {
    if (pathPoints.length <= 2) return
    onChange(pathPoints.slice(0, -1))
  }

  const updatePoint = (index: number, axis: 'x' | 'y', value: number) => {
    const newPts = [...pathPoints]
    const snapped = snapToGrid(value)
    newPts[index] = { ...newPts[index], [axis]: snapped }
    onChange(newPts)
  }

  const startPickPoint = (index: number) => {
    setPickingIndex(index)
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_WIDTH / rect.width
      const scaleY = CANVAS_HEIGHT / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      const newPts = [...pathPoints]
      newPts[index] = { x: snapToGrid(x - enemyElement.width / 2), y: snapToGrid(y - enemyElement.height / 2) }
      onChange(newPts)

      setPickingIndex(null)
      canvas.removeEventListener('click', handleClick, true)
    }

    setTimeout(() => {
      canvas.addEventListener('click', handleClick, { once: true, capture: true })
    }, 50)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 12,
          color: '#555',
          fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
        }}>
          路径点: <strong style={{ color: '#3b82f6' }}>{pathPoints.length}</strong>/4
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={addPoint}
            disabled={pathPoints.length >= 4}
            style={{
              padding: '3px 10px',
              borderRadius: 5,
              border: '1px solid #e5e5e5',
              background: pathPoints.length >= 4 ? '#f5f5f5' : '#fff',
              color: pathPoints.length >= 4 ? '#aaa' : '#333',
              cursor: pathPoints.length >= 4 ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all 0.2s',
              fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
            }}
            onMouseEnter={e => {
              if (pathPoints.length < 4) {
                e.currentTarget.style.background = '#f0f7ff'
                e.currentTarget.style.borderColor = '#60a5fa'
                e.currentTarget.style.color = '#2563eb'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = pathPoints.length >= 4 ? '#f5f5f5' : '#fff'
              e.currentTarget.style.borderColor = '#e5e5e5'
              e.currentTarget.style.color = pathPoints.length >= 4 ? '#aaa' : '#333'
            }}
          >
            + 添加
          </button>
          <button
            onClick={removePoint}
            disabled={pathPoints.length <= 2}
            style={{
              padding: '3px 10px',
              borderRadius: 5,
              border: '1px solid #e5e5e5',
              background: pathPoints.length <= 2 ? '#f5f5f5' : '#fff',
              color: pathPoints.length <= 2 ? '#aaa' : '#333',
              cursor: pathPoints.length <= 2 ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all 0.2s',
              fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
            }}
            onMouseEnter={e => {
              if (pathPoints.length > 2) {
                e.currentTarget.style.background = '#fff5f5'
                e.currentTarget.style.borderColor = '#fca5a5'
                e.currentTarget.style.color = '#dc2626'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = pathPoints.length <= 2 ? '#f5f5f5' : '#fff'
              e.currentTarget.style.borderColor = '#e5e5e5'
              e.currentTarget.style.color = pathPoints.length <= 2 ? '#aaa' : '#333'
            }}
          >
            − 删除
          </button>
        </div>
      </div>

      {pickingIndex !== null && (
        <div style={{
          padding: '8px 12px',
          background: '#f0f7ff',
          border: '1px dashed #60a5fa',
          borderRadius: 6,
          fontSize: 12,
          color: '#2563eb',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
        }}>
          <span>🎯</span>
          <span>点击画布中任意位置放置路径点 P{pickingIndex + 1}，按 Esc 取消</span>
        </div>
      )}

      {pathPoints.map((pt, i) => (
        <div
          key={i}
          style={{
            padding: '10px',
            background: pickingIndex === i ? '#f0f7ff' : '#fafafa',
            borderRadius: 8,
            border: `1px solid ${pickingIndex === i ? '#60a5fa' : '#eeeeee'}`,
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                boxShadow: '0 2px 4px rgba(59,130,246,0.3)',
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>路径点 P{i + 1}</span>
            </div>
            <button
              onClick={() => startPickPoint(i)}
              disabled={pickingIndex !== null}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid #e5e5e5',
                background: pickingIndex === i ? '#f0f7ff' : '#fff',
                color: pickingIndex === i ? '#2563eb' : '#666',
                cursor: pickingIndex !== null && pickingIndex !== i ? 'not-allowed' : 'pointer',
                fontSize: 11,
                transition: 'all 0.2s',
                fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
              }}
              title="在画布上点击以选择位置"
              onMouseEnter={e => {
                if (pickingIndex === null) {
                  e.currentTarget.style.background = '#f0f7ff'
                  e.currentTarget.style.borderColor = '#60a5fa'
                  e.currentTarget.style.color = '#2563eb'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = pickingIndex === i ? '#f0f7ff' : '#fff'
                e.currentTarget.style.borderColor = '#e5e5e5'
                e.currentTarget.style.color = pickingIndex === i ? '#2563eb' : '#666'
              }}
            >
              🎯 点选
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <label style={{ fontSize: 11, color: '#888', minWidth: 14 }}>X</label>
              <input
                type="number"
                value={pt.x}
                onChange={e => updatePoint(i, 'x', Number(e.target.value))}
                min={0}
                max={CANVAS_WIDTH}
                step={GRID_SIZE}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: 5,
                  border: '1px solid #e0e0e0',
                  fontSize: 12,
                  background: '#fff',
                  color: '#333',
                  transition: 'all 0.2s',
                  fontFamily: 'ui-monospace, Menlo, monospace',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <label style={{ fontSize: 11, color: '#888', minWidth: 14 }}>Y</label>
              <input
                type="number"
                value={pt.y}
                onChange={e => updatePoint(i, 'y', Number(e.target.value))}
                min={0}
                max={CANVAS_HEIGHT}
                step={GRID_SIZE}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: 5,
                  border: '1px solid #e0e0e0',
                  fontSize: 12,
                  background: '#fff',
                  color: '#333',
                  transition: 'all 0.2s',
                  fontFamily: 'ui-monospace, Menlo, monospace',
                }}
              />
            </div>
          </div>
        </div>
      ))}

      <div style={{
        padding: '8px 12px',
        background: '#fefce8',
        border: '1px solid #fde68a',
        borderRadius: 6,
        fontSize: 11,
        color: '#854d0e',
        lineHeight: 1.5,
        fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
      }}>
        <strong>提示：</strong>敌人将按顺序在这些路径点之间循环巡逻，到达后等待 <strong>{enemyElement.patrolInterval}</strong> 秒再继续移动。
        <span style={{ display: 'none' }}>{enemyId}</span>
      </div>
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

  const typeName: Record<string, string> = {
    ground: '地面块',
    movingPlatform: '移动平台',
    spike: '尖刺',
    flag: '终点旗',
    slime: '史莱姆',
    dragon: '飞龙',
  }
  const typeIcon: Record<string, string> = {
    ground: '🟩',
    movingPlatform: '🟧',
    spike: '🔺',
    flag: '🚩',
    slime: '🟢',
    dragon: '🟥',
  }

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
            fontSize: 16,
            padding: 4,
            width: 32,
            height: 32,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          title="展开属性面板"
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f5f5f5'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'none'
          }}
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
      maxHeight: 'calc(100vh - 80px)',
      fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#1a1a2e',
          }}>
            属性面板
          </span>
          <span style={{
            fontSize: 11,
            color: '#999',
          }}>
            修改参数实时预览
          </span>
        </div>
        <button
          onClick={() => setRightPanelCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            fontSize: 14,
            padding: 4,
            width: 28,
            height: 28,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          title="折叠面板"
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f5f5f5'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'none'
          }}
        >
          ▶
        </button>
      </div>

      {!selectedElement ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          padding: '32px 16px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f0f0f0 0%, #f8f8f8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>
            👆
          </div>
          <div>
            <div style={{
              color: '#555',
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 4,
            }}>
              未选中元素
            </div>
            <div style={{
              color: '#999',
              fontSize: 12,
              lineHeight: 1.5,
            }}>
              点击画布中任意元素<br />查看并编辑其属性
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: `linear-gradient(135deg, ${selectedElement.type === 'dragon' || selectedElement.type === 'spike' ? '#fff5f5' : selectedElement.type === 'flag' ? '#fffbeb' : selectedElement.type === 'slime' || selectedElement.type === 'ground' ? '#f0fdf4' : '#fff7ed'} 0%, #fafafa 100%)`,
            borderRadius: 10,
            border: '1px solid #eeeeee',
          }}>
            <div style={{
              fontSize: 28,
            }}>
              {typeIcon[selectedElement.type]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#1a1a2e',
              }}>
                {typeName[selectedElement.type]}
              </span>
              <span style={{
                fontSize: 11,
                color: '#888',
                fontFamily: 'ui-monospace, Menlo, monospace',
              }}>
                ID: {selectedElement.id.slice(-10)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>位置 X</label>
              <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                {selectedElement.x}px
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>位置 Y</label>
              <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                {selectedElement.y}px
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>尺寸 (W × H)</label>
              <span style={{ fontSize: 12, color: '#666', fontFamily: 'ui-monospace, Menlo, monospace' }}>
                {selectedElement.width} × {selectedElement.height}
              </span>
            </div>
          </div>

          {isSelectedEnemy && enemyElement && (
            <>
              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #eeeeee, transparent)' }} />

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 8 }}>
                  🛤️ 移动路径
                </label>
                <PathPointEditor
                  enemyId={enemyElement.id}
                  enemyElement={enemyElement}
                  pathPoints={enemyElement.pathPoints}
                  onChange={(pts) => updateEnemy(enemyElement.id, { pathPoints: pts })}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 8 }}>
                  ⚡ 移动速度
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                  <span style={{
                    padding: '3px 10px',
                    background: '#f0f7ff',
                    color: '#2563eb',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'ui-monospace, Menlo, monospace',
                  }}>
                    {enemyElement.speed.toFixed(1)} px/帧
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: '#999',
                  }}>
                    范围 0.5 ~ 3.0
                  </span>
                </div>
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

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 8 }}>
                  ⏱️ 巡逻间隔
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <input
                    type="number"
                    min={0.5}
                    max={30}
                    step={0.5}
                    value={enemyElement.patrolInterval}
                    onChange={e => updateEnemy(enemyElement.id, { patrolInterval: Math.max(0, Number(e.target.value)) })}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #e0e0e0',
                      fontSize: 13,
                      background: '#fff',
                      color: '#333',
                      transition: 'all 0.2s',
                      fontFamily: 'ui-monospace, Menlo, monospace',
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#777' }}>秒</span>
                </div>
              </div>
            </>
          )}

          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #eeeeee, transparent)' }} />

          <button
            onClick={() => {
              removeElement(selectedElement.id)
            }}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #fecaca',
              background: '#fff5f5',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fee2e2'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,38,38,0.15)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#fff5f5'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <span>🗑️</span>
            <span>删除此元素</span>
          </button>
        </>
      )}
    </div>
  )
}
