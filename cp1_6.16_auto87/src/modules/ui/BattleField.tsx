import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  GameEngine,
  HexCoord,
  Unit,
  HexCell,
  UnitType,
  TerrainType,
  TerrainEffect
} from '../game/GameEngine'

interface BattleFieldProps {
  engine: GameEngine
  refreshTrigger: number
  onStateChange: () => void
  selectedCardId: string | null
  validCardTargets: { units: Unit[]; cells: HexCoord[] }
  onCardTargetSelected: (unitId?: string, cell?: HexCoord) => void
}

interface FloatingText {
  id: number
  x: number
  y: number
  text: string
  color: string
}

interface AttackEffect {
  id: number
  fromX: number
  fromY: number
  toX: number
  toY: number
}

let effectIdCounter = 0

const BattleField: React.FC<BattleFieldProps> = ({
  engine,
  refreshTrigger,
  onStateChange,
  selectedCardId,
  validCardTargets,
  onCardTargetSelected
}) => {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [showDeployMenu, setShowDeployMenu] = useState<HexCoord | null>(null)
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([])
  const [attackEffects, setAttackEffects] = useState<AttackEffect[]>([])
  const [animatingUnits, setAnimatingUnits] = useState<Record<string, { fromX: number; fromY: number; toX: number; toY: number }>>({})
  const [newlyDeployed, setNewlyDeployed] = useState<Set<string>>(new Set())
  const [hoveredCell, setHoveredCell] = useState<HexCoord | null>(null)

  const HEX_SIZE = 36
  const state = engine.getState()
  const gridSize = engine.getGridSize()
  const gridWidth = HEX_SIZE * 1.5 * gridSize + HEX_SIZE * 2
  const gridHeight = HEX_SIZE * Math.sqrt(3) * gridSize + HEX_SIZE * 2

  const movableRange = useMemo(() => {
    if (!selectedUnit || selectedUnit.side !== 'player') return []
    return engine.getMovableRange(selectedUnit)
  }, [selectedUnit, refreshTrigger, engine])

  const attackableRange = useMemo(() => {
    if (!selectedUnit || selectedUnit.side !== 'player') return []
    return engine.getAttackableRange(selectedUnit)
  }, [selectedUnit, refreshTrigger, engine])

  useEffect(() => {
    if (!selectedUnit) return
    const stillExists = state.units.find(u => u.id === selectedUnit.id)
    if (!stillExists) setSelectedUnit(null)
  }, [state.units, selectedUnit])

  const getHexPath = (cx: number, cy: number, size: number): string => {
    const points: string[] = []
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6
      points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`)
    }
    return `M${points.join(' L')} Z`
  }

  const addFloatingText = useCallback((x: number, y: number, text: string, color: string) => {
    const id = ++effectIdCounter
    setFloatingTexts(prev => [...prev, { id, x, y, text, color }])
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id))
    }, 1000)
  }, [])

  const addAttackEffect = useCallback((fromX: number, fromY: number, toX: number, toY: number) => {
    const id = ++effectIdCounter
    setAttackEffects(prev => [...prev, { id, fromX, fromY, toX, toY }])
    setTimeout(() => {
      setAttackEffects(prev => prev.filter(e => e.id !== id))
    }, 300)
  }, [])

  const handleCellClick = (cell: HexCell) => {
    if (state.gameOver || state.currentTurn !== 'player') return

    if (selectedCardId && validCardTargets.cells.some(c => c.q === cell.coord.q && c.r === cell.coord.r)) {
      onCardTargetSelected(undefined, cell.coord)
      return
    }

    if (!cell.unit && cell.coord.r >= 6 && !selectedUnit) {
      setShowDeployMenu(cell.coord)
      return
    }

    if (selectedUnit && movableRange.some(c => c.q === cell.coord.q && c.r === cell.coord.r)) {
      const from = engine.hexToPixel(selectedUnit.position, HEX_SIZE)
      const to = engine.hexToPixel(cell.coord, HEX_SIZE)

      setAnimatingUnits(prev => ({
        ...prev,
        [selectedUnit.id]: {
          fromX: from.x + HEX_SIZE,
          fromY: from.y + HEX_SIZE,
          toX: to.x + HEX_SIZE,
          toY: to.y + HEX_SIZE
        }
      }))

      engine.moveUnit(selectedUnit.id, cell.coord)

      setTimeout(() => {
        setAnimatingUnits(prev => {
          const next = { ...prev }
          delete next[selectedUnit.id]
          return next
        })
        setSelectedUnit(null)
        onStateChange()
      }, 500)
      return
    }

    if (cell.unit) {
      handleUnitClick(cell.unit)
    } else {
      setSelectedUnit(null)
      setShowDeployMenu(null)
    }
  }

  const handleUnitClick = (unit: Unit) => {
    if (state.gameOver || state.currentTurn !== 'player') return

    if (selectedCardId && validCardTargets.units.some(u => u.id === unit.id)) {
      onCardTargetSelected(unit.id)
      return
    }

    if (selectedUnit && attackableRange.some(c => c.q === unit.position.q && c.r === unit.position.r) && unit.side !== selectedUnit.side) {
      const from = engine.hexToPixel(selectedUnit.position, HEX_SIZE)
      const to = engine.hexToPixel(unit.position, HEX_SIZE)
      addAttackEffect(
        from.x + HEX_SIZE,
        from.y + HEX_SIZE,
        to.x + HEX_SIZE,
        to.y + HEX_SIZE
      )

      const result = engine.attackUnit(selectedUnit.id, unit.id)

      if (result) {
        const targetPos = engine.hexToPixel(unit.position, HEX_SIZE)
        if (result.damage > 0) {
          addFloatingText(
            targetPos.x + HEX_SIZE,
            targetPos.y + HEX_SIZE - 10,
            `-${result.damage}`,
            '#FF4444'
          )
        } else if (result.dodged) {
          addFloatingText(
            targetPos.x + HEX_SIZE,
            targetPos.y + HEX_SIZE - 10,
            '闪避!',
            '#3498DB'
          )
        } else if (result.missReason === '未命中') {
          addFloatingText(
            targetPos.x + HEX_SIZE,
            targetPos.y + HEX_SIZE - 10,
            '未命中',
            '#999999'
          )
        }
        onStateChange()
      }
      setSelectedUnit(null)
      return
    }

    if (unit.side === 'player') {
      setSelectedUnit(unit)
      setShowDeployMenu(null)
    }
  }

  const handleDeploy = (type: UnitType) => {
    if (!showDeployMenu) return
    const unit = engine.deployUnit(type, 'player', showDeployMenu)
    if (unit) {
      setNewlyDeployed(prev => new Set(prev).add(unit.id))
      setTimeout(() => {
        setNewlyDeployed(prev => {
          const next = new Set(prev)
          next.delete(unit.id)
          return next
        })
      }, 300)
      onStateChange()
    }
    setShowDeployMenu(null)
  }

  const getUnitColor = (type: UnitType): string => {
    return type === 'infantry' ? '#E74C3C' : type === 'archer' ? '#3498DB' : '#F39C12'
  }

  const getTerrainName = (terrain: TerrainType): string => {
    const names: Record<TerrainType, string> = {
      plain: '平原',
      forest: '森林',
      river: '河流',
      highland: '高地'
    }
    return names[terrain]
  }

  const getTerrainTooltipInfo = (cell: HexCell): { terrainName: string; effect: TerrainEffect; unitTypeName: string } | null => {
    if (!selectedUnit) return null
    const effect = engine.getTerrainEffect(cell.terrain, selectedUnit.type)
    return {
      terrainName: getTerrainName(cell.terrain),
      effect,
      unitTypeName: engine.getUnitTypeName(selectedUnit.type)
    }
  }

  const getGridCoordLabel = (q: number, r: number): string => {
    const colLetter = String.fromCharCode(65 + q)
    const rowNumber = r + 1
    return `${colLetter}${rowNumber}`
  }

  const renderUnit = (unit: Unit, pixelX: number, pixelY: number) => {
    const isSelected = selectedUnit?.id === unit.id
    const isAnimating = animatingUnits[unit.id]
    const isNew = newlyDeployed.has(unit.id)

    if (isAnimating) {
      return null
    }

    const animationStyle: React.CSSProperties = isNew ? { animation: 'unitDeploy 0.3s ease-out' } : {}
    const color = getUnitColor(unit.type)
    const hpPercent = unit.hp / unit.maxHp
    const hpColor = hpPercent > 0.6 ? '#2ECC71' : hpPercent > 0.3 ? '#F1C40F' : '#E74C3C'
    const cx = pixelX + HEX_SIZE
    const cy = pixelY + HEX_SIZE

    const statusIcons = unit.statusEffects.map((e, i) => {
      const icon = e.type === 'ambush' ? '🛡' : e.type === 'burn' ? '🔥' : e.type === 'stun' ? '💫' : ''
      return (
        <text
          key={i}
          x={cx + 12 + i * 12}
          y={cy - 20}
          fontSize={12}
          textAnchor="middle"
        >
          {icon}
        </text>
      )
    })

    let shape: React.ReactNode = null

    if (unit.type === 'infantry') {
      shape = (
        <polygon
          points={getHexPath(cx, cy, HEX_SIZE * 0.55)}
          fill={color}
          stroke={unit.side === 'player' ? '#FFFFFF' : '#000000'}
          strokeWidth={2}
        />
      )
    } else if (unit.type === 'archer') {
      const s = HEX_SIZE * 0.6
      const pts = `${cx},${cy - s} ${cx - s},${cy + s * 0.7} ${cx + s},${cy + s * 0.7}`
      shape = (
        <polygon
          points={pts}
          fill={color}
          stroke={unit.side === 'player' ? '#FFFFFF' : '#000000'}
          strokeWidth={2}
        />
      )
    } else {
      const s = HEX_SIZE * 0.55
      const pts = `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`
      shape = (
        <polygon
          points={pts}
          fill={color}
          stroke={unit.side === 'player' ? '#FFFFFF' : '#000000'}
          strokeWidth={2}
        />
      )
    }

    return (
      <g key={unit.id} style={animationStyle} className="unit-group">
        {isSelected && (
          <circle
            cx={cx}
            cy={cy}
            r={HEX_SIZE * 0.9}
            fill="none"
            stroke="#FFD700"
            strokeWidth={3}
            strokeDasharray="5,3"
          />
        )}
        {shape}
        <rect
          x={cx - 20}
          y={cy + HEX_SIZE * 0.6}
          width={40}
          height={6}
          fill="#333"
          rx={2}
        />
        <rect
          x={cx - 20}
          y={cy + HEX_SIZE * 0.6}
          width={40 * hpPercent}
          height={6}
          fill={hpColor}
          rx={2}
        />
        {unit.isGeneral && (
          <text
            x={cx}
            y={cy - HEX_SIZE * 0.65}
            fontSize={14}
            textAnchor="middle"
          >
            👑
          </text>
        )}
        {statusIcons}
      </g>
    )
  }

  const handleBgClick = () => {
    setShowDeployMenu(null)
  }

  return (
    <div className="battlefield-container" onClick={handleBgClick}>
      <svg
        width={gridWidth + 40}
        height={gridHeight + 40}
        viewBox={`0 0 ${gridWidth + 40} ${gridHeight + 40}`}
      >
        <defs>
          <style>{`
            @keyframes unitDeploy {
              0% { transform: scale(1.2); }
              100% { transform: scale(1); }
            }
            @keyframes floatUp {
              0% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(-30px); }
            }
            @keyframes attackShock {
              0% { stroke-width: 0; opacity: 1; }
              50% { stroke-width: 8; opacity: 0.8; }
              100% { stroke-width: 2; opacity: 0; }
            }
            .floating-text {
              animation: floatUp 1s ease-out forwards;
            }
          `}</style>
        </defs>

        <g transform="translate(20, 20)">
          <g className="battlefield-border">
            {(() => {
              const size = engine.getGridSize()
              const borderCells: { q: number; r: number }[] = []
              for (let r = 0; r < size; r++) {
                for (let q = 0; q < size; q++) {
                  if (r === 0 || r === size - 1 || q === 0 || q === size - 1) {
                    borderCells.push({ q, r })
                  }
                }
              }
              return borderCells.map(({ q, r }) => {
                const pos = engine.hexToPixel({ q, r }, HEX_SIZE)
                const cx = pos.x + HEX_SIZE
                const cy = pos.y + HEX_SIZE
                return (
                  <path
                    key={`border-${q}-${r}`}
                    d={getHexPath(cx, cy, HEX_SIZE - 0.5)}
                    fill="none"
                    stroke="#8B7355"
                    strokeWidth={2}
                    opacity={0.8}
                    style={{ pointerEvents: 'none' }}
                  />
                )
              })
            })()}
          </g>

          {selectedUnit && selectedUnit.side === 'player' && movableRange.length > 0 && (
            <g className="adjacency-lines">
              {(() => {
                const fromPos = engine.hexToPixel(selectedUnit.position, HEX_SIZE)
                const fromX = fromPos.x + HEX_SIZE
                const fromY = fromPos.y + HEX_SIZE
                return movableRange.map((coord, index) => {
                  const toPos = engine.hexToPixel(coord, HEX_SIZE)
                  const toX = toPos.x + HEX_SIZE
                  const toY = toPos.y + HEX_SIZE
                  return (
                    <line
                      key={`adj-line-${index}`}
                      x1={fromX}
                      y1={fromY}
                      x2={toX}
                      y2={toY}
                      stroke="rgba(192, 192, 192, 0.25)"
                      strokeWidth={1}
                      strokeDasharray="4,3"
                      style={{ pointerEvents: 'none' }}
                    />
                  )
                })
              })()}
            </g>
          )}

          {state.grid.map((row, r) =>
            row.map((cell, q) => {
              const pos = engine.hexToPixel(cell.coord, HEX_SIZE)
              const isMovable = movableRange.some(c => c.q === q && c.r === r)
              const isAttackable = attackableRange.some(c => c.q === q && c.r === r)
              const isCardTargetCell = validCardTargets.cells.some(c => c.q === q && c.r === r)
              const isCardTargetUnit = cell.unit && validCardTargets.units.some(u => u.id === cell.unit!.id)
              const isDeployZone = r >= 6
              const cx = pos.x + HEX_SIZE
              const cy = pos.y + HEX_SIZE

              return (
                <g
                  key={`${q}-${r}`}
                  onClick={(e) => { e.stopPropagation(); handleCellClick(cell) }}
                  onMouseEnter={() => setHoveredCell({ q, r })}
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d={getHexPath(cx, cy, HEX_SIZE - 1)}
                    fill={engine.getTerrainColor(cell.terrain)}
                    stroke="#2C1810"
                    strokeWidth={1}
                  />
                  {isDeployZone && (
                    <path
                      d={getHexPath(cx, cy, HEX_SIZE - 3)}
                      fill="rgba(255, 215, 0, 0.1)"
                      stroke="rgba(255, 215, 0, 0.3)"
                      strokeDasharray="3,3"
                    />
                  )}
                  {isMovable && (
                    <path
                      d={getHexPath(cx, cy, HEX_SIZE - 3)}
                      fill="rgba(0, 255, 0, 0.3)"
                      stroke="#00FF00"
                      strokeWidth={2}
                    />
                  )}
                  {isAttackable && (
                    <path
                      d={getHexPath(cx, cy, HEX_SIZE - 3)}
                      fill="rgba(255, 0, 0, 0.3)"
                      stroke="#FF0000"
                      strokeWidth={2}
                    />
                  )}
                  {isCardTargetCell && (
                    <path
                      d={getHexPath(cx, cy, HEX_SIZE - 3)}
                      fill="rgba(255, 215, 0, 0.4)"
                      stroke="#FFD700"
                      strokeWidth={2}
                      strokeDasharray="5,3"
                    />
                  )}
                  {isCardTargetUnit && (
                    <path
                      d={getHexPath(cx, cy, HEX_SIZE * 0.9)}
                      fill="none"
                      stroke="#FFD700"
                      strokeWidth={3}
                      strokeDasharray="5,3"
                    />
                  )}
                  <text
                    x={cx}
                    y={cy + HEX_SIZE * 0.35}
                    fontSize={9}
                    fill="rgba(0,0,0,0.4)"
                    textAnchor="middle"
                  >
                    {cell.terrain === 'forest' ? '🌲' : cell.terrain === 'river' ? '🌊' : cell.terrain === 'highland' ? '⛰' : ''}
                  </text>
                  <text
                    x={cx}
                    y={cy - HEX_SIZE * 0.3}
                    fontSize={12}
                    fill="#8B7355"
                    opacity={0.7}
                    textAnchor="middle"
                    fontWeight="500"
                    style={{ pointerEvents: 'none' }}
                  >
                    {getGridCoordLabel(q, r)}
                  </text>
                </g>
              )
            })
          )}

          {state.units.map(unit => {
            const pos = engine.hexToPixel(unit.position, HEX_SIZE)
            return renderUnit(unit, pos.x, pos.y)
          })}

          {Object.entries(animatingUnits).map(([unitId, anim]) => {
            const unit = state.units.find(u => u.id === unitId)
            if (!unit) return null
            return (
              <g key={`anim-${unitId}`}>
                <circle
                  cx={anim.toX}
                  cy={anim.toY}
                  r={HEX_SIZE * 0.5}
                  fill={getUnitColor(unit.type)}
                  stroke={unit.side === 'player' ? '#FFFFFF' : '#000000'}
                  strokeWidth={2}
                  style={{ animation: 'unitDeploy 0.5s ease-out' }}
                />
              </g>
            )
          })}

          {attackEffects.map(effect => (
            <g key={effect.id}>
              <line
                x1={effect.fromX}
                y1={effect.fromY}
                x2={effect.toX}
                y2={effect.toY}
                stroke="#FF0000"
                strokeWidth={4}
                style={{ animation: 'attackShock 0.3s ease-out forwards' }}
              />
              <circle
                cx={effect.toX}
                cy={effect.toY}
                r={HEX_SIZE * 0.8}
                fill="rgba(255, 0, 0, 0.4)"
                stroke="#FF4444"
                strokeWidth={2}
                style={{ animation: 'attackShock 0.3s ease-out forwards' }}
              />
            </g>
          ))}

          {floatingTexts.map(ft => (
            <text
              key={ft.id}
              x={ft.x}
              y={ft.y}
              fontSize={20}
              fill={ft.color}
              fontWeight="bold"
              textAnchor="middle"
              className="floating-text"
            >
              {ft.text}
            </text>
          ))}
        </g>
      </svg>

      {hoveredCell && (() => {
        const cell = state.grid[hoveredCell.r]?.[hoveredCell.q]
        if (!cell) return null
        const tooltipInfo = getTerrainTooltipInfo(cell)
        if (!tooltipInfo) return null
        const pos = engine.hexToPixel(hoveredCell, HEX_SIZE)

        const effectLines: { label: string; value: string; isPositive: boolean }[] = []

        const e = tooltipInfo.effect
        if (e.moveCostMultiplier !== 1) {
          const val = e.moveCostMultiplier < 1 ? `×${e.moveCostMultiplier}` : `×${e.moveCostMultiplier}`
          effectLines.push({ label: '移动消耗', value: val, isPositive: e.moveCostMultiplier < 1 })
        }
        if (e.attackMultiplier !== 1) {
          const pct = Math.round((e.attackMultiplier - 1) * 100)
          effectLines.push({ label: '攻击力', value: `${pct > 0 ? '+' : ''}${pct}%`, isPositive: pct > 0 })
        }
        if (e.dodgeBonus > 0) {
          effectLines.push({ label: '闪避率', value: `+${Math.round(e.dodgeBonus * 100)}%`, isPositive: true })
        }
        if (e.hitRateModifier !== 0) {
          const pct = Math.round(e.hitRateModifier * 100)
          effectLines.push({ label: '命中率', value: `${pct > 0 ? '+' : ''}${pct}%`, isPositive: pct > 0 })
        }
        if (e.rangeBonus > 0) {
          effectLines.push({ label: '射程', value: `+${e.rangeBonus}`, isPositive: true })
        }
        if (e.moveRangeBonus > 0) {
          effectLines.push({ label: '移动力', value: `+${e.moveRangeBonus}`, isPositive: true })
        }

        return (
          <div
            className="terrain-tooltip"
            style={{
              position: 'absolute',
              left: Math.min(pos.x + 20, (gridWidth || 700) - 180),
              top: Math.max(pos.y - 10, 10),
              background: 'rgba(44, 30, 20, 0.95)',
              border: '2px solid #8B7355',
              borderRadius: '8px',
              padding: '10px 14px',
              zIndex: 50,
              pointerEvents: 'none',
              minWidth: '160px'
            }}
          >
            <div className="terrain-tooltip-title" style={{ color: '#FFD700', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', letterSpacing: '1px' }}>
              {tooltipInfo.terrainName}
            </div>
            <div className="terrain-tooltip-unit" style={{ color: '#F5E6D3', fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
              对{tooltipInfo.unitTypeName}的影响：
            </div>
            {effectLines.length === 0 ? (
              <div style={{ color: '#999', fontSize: '12px', fontStyle: 'italic' }}>无特殊效果</div>
            ) : (
              effectLines.map((line, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', fontSize: '12px' }}>
                  <span style={{ color: '#F5E6D3', opacity: 0.9 }}>{line.label}</span>
                  <span style={{ color: line.isPositive ? '#2ECC71' : '#E74C3C', fontWeight: 'bold' }}>
                    {line.value}
                  </span>
                </div>
              ))
            )}
          </div>
        )
      })()}

      {showDeployMenu && (() => {
        const pos = engine.hexToPixel(showDeployMenu, HEX_SIZE)
        const unitTypes: UnitType[] = ['infantry', 'archer', 'cavalry']
        return (
          <div
            className="deploy-menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: pos.x + 40,
              top: pos.y + 40,
              background: 'rgba(44, 62, 80, 0.95)',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 100
            }}
          >
            <div className="deploy-title">选择兵种</div>
            {unitTypes.map(type => (
              <button
                key={type}
                className="deploy-option"
                onClick={() => handleDeploy(type)}
              >
                <span className="deploy-icon">
                  {type === 'infantry' ? '⬢' : type === 'archer' ? '▲' : '◆'}
                </span>
                <span>{engine.getUnitTypeName(type)}</span>
              </button>
            ))}
            <button
              className="deploy-cancel"
              onClick={() => setShowDeployMenu(null)}
            >
              取消
            </button>
          </div>
        )
      })()}
    </div>
  )
}

export default BattleField
