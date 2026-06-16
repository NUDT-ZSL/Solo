import { useState, useEffect, useRef, useCallback } from 'react'
import Cauldron from './Cauldron'
import MaterialPanel from './MaterialPanel'
import { checkReaction, getMaterialById, type ReactionResult } from './reactionEngine'

type LogStatus = 'success' | 'normal' | 'fail'

interface LogEntry {
  id: number
  message: string
  status: LogStatus
  time: string
}

interface Props {
  onOpenBook: () => void
  onUnlockRecipe: (id: string) => void
}

export default function GameBoard({ onOpenBook, onUnlockRecipe }: Props) {
  const [materials, setMaterials] = useState<string[]>([])
  const [temperature, setTemperature] = useState<number>(20)
  const [heating, setHeating] = useState(false)
  const [cooling, setCooling] = useState(false)
  const [stirring, setStirring] = useState(false)
  const [stirredRecently, setStirredRecently] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [reaction, setReaction] = useState<ReactionResult | null>(null)
  const [shaking, setShaking] = useState(false)
  const logIdRef = useRef(0)
  const stirredTimerRef = useRef<number | null>(null)

  const addLog = useCallback((message: string, status: LogStatus = 'normal') => {
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    setLogs((prev) => [
      { id: ++logIdRef.current, message, status, time },
      ...prev,
    ].slice(0, 100))
  }, [])

  useEffect(() => {
    let interval: number
    if (heating && !cooling) {
      interval = window.setInterval(() => {
        setTemperature((t) => Math.round(Math.min(t + 10, 1000)))
      }, 1000)
    } else if (cooling && !heating) {
      interval = window.setInterval(() => {
        setTemperature((t) => Math.round(Math.max(t - 15, -100)))
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [heating, cooling])

  useEffect(() => {
    if (reaction) return
    if (materials.length === 0) return
    const result = checkReaction(materials, temperature, stirredRecently)
    if (result) {
      setReaction(result)
      setShaking(true)
      setTimeout(() => setShaking(false), 100)
      setMaterials([])
      onUnlockRecipe(result.recipe.id)
      addLog(`触发反应：生成${result.recipe.name}`, 'success')
    }
  }, [materials, temperature, stirredRecently, reaction, addLog, onUnlockRecipe])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const matId = e.dataTransfer.getData('material-id')
    if (!matId) return
    if (materials.length >= 4) {
      addLog('坩埚已满，无法添加更多材料', 'fail')
      return
    }
    const mat = getMaterialById(matId)
    if (!mat) return
    if (materials.includes(matId)) {
      addLog(`坩埚中已有${mat.name}`, 'normal')
      return
    }
    setMaterials((prev) => {
      const next = [...prev, matId]
      if (next.length > 1) {
        const names = next.map((id) => getMaterialById(id)?.name ?? '').join('与')
        addLog(`混合${names}`, 'normal')
      } else {
        addLog(`加入${mat.name}`, 'normal')
      }
      return next
    })
  }

  const handleHeat = () => {
    setHeating((h) => {
      const next = !h
      if (next) {
        setCooling(false)
        addLog('开始加热', 'normal')
      } else {
        addLog('停止加热', 'normal')
      }
      return next
    })
  }

  const handleCool = () => {
    setCooling((c) => {
      const next = !c
      if (next) {
        setHeating(false)
        addLog('开始冷却', 'normal')
      } else {
        addLog('停止冷却', 'normal')
      }
      return next
    })
  }

  const handleStir = () => {
    if (stirring) return
    if (materials.length < 2) {
      addLog('至少需要两种材料才能搅拌', 'fail')
      return
    }
    setStirring(true)
    setStirredRecently(true)
    addLog('搅拌混合物', 'normal')
    if (stirredTimerRef.current) clearTimeout(stirredTimerRef.current)
    stirredTimerRef.current = window.setTimeout(() => {
      setStirring(false)
    }, 2000)
    window.setTimeout(() => {
      setStirredRecently(false)
    }, 5000)
  }

  const handleClearCauldron = () => {
    if (materials.length === 0) return
    setMaterials([])
    setTemperature(20)
    setHeating(false)
    setCooling(false)
    addLog('清空坩埚', 'normal')
  }

  const statusColors: Record<LogStatus, string> = {
    success: '#16a34a',
    normal: '#64748b',
    fail: '#dc2626',
  }

  return (
    <div
      className={shaking ? 'shake' : ''}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
      }}
    >
      <MaterialPanel onOpenBook={onOpenBook} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: 24,
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: '#ffd700',
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 2px 4px rgba(0,0,0,0.8)',
            letterSpacing: 4,
          }}
        >
          ⚗ 炼金术士实验台 ⚗
        </div>

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{ position: 'relative' }}
        >
          <Cauldron
            materials={materials}
            temperature={temperature}
            heating={heating}
            cooling={cooling}
            stirring={stirring}
          />

          {materials.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: -36,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {materials.map((id) => {
                const mat = getMaterialById(id)
                if (!mat) return null
                return (
                  <div
                    key={id}
                    title={mat.name}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: mat.color,
                      border: '1px solid #b8860b',
                      boxShadow: '0 0 4px rgba(255, 215, 0, 0.4)',
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
          <ControlButton
            label="🔥 加热"
            bg="#dc2626"
            active={heating}
            onClick={handleHeat}
          />
          <ControlButton
            label="❄ 冷却"
            bg="#2563eb"
            active={cooling}
            onClick={handleCool}
          />
          <ControlButton
            label="🌀 搅拌"
            bg="#16a34a"
            active={stirring}
            onClick={handleStir}
          />
          <ControlButton
            label="🧹 清空"
            bg="#6b7280"
            active={false}
            onClick={handleClearCauldron}
          />
        </div>

        <div
          style={{
            color: '#94a3b8',
            fontSize: 13,
            textAlign: 'center',
            maxWidth: 520,
            lineHeight: 1.6,
          }}
        >
          将左侧材料拖拽至坩埚中混合，使用加热、冷却或搅拌触发神秘的炼金反应。
          <br />
          探索配方，解锁所有炼金秘术！
        </div>
      </div>

      <div
        style={{
          width: 220,
          height: '100%',
          background: 'rgba(15, 23, 42, 0.75)',
          borderLeft: '2px solid #b8860b',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: 18,
            padding: '16px 12px',
            borderBottom: '1px solid #334155',
            textAlign: 'center',
          }}
        >
          📜 实验记录
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 8,
          }}
        >
          {logs.length === 0 ? (
            <div
              style={{
                color: '#64748b',
                textAlign: 'center',
                fontSize: 12,
                padding: 20,
              }}
            >
              暂无实验记录
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 6px',
                  borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: statusColors[log.status],
                    flexShrink: 0,
                    marginTop: 3,
                    boxShadow: `0 0 6px ${statusColors[log.status]}`,
                  }}
                />
                <div style={{ flex: 1, color: '#e2e8f0' }}>
                  <div>{log.message}</div>
                  <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                    {log.time}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {reaction && (
        <div className="modal-overlay" onClick={() => setReaction(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 400,
              height: 300,
              borderRadius: 16,
              background: '#1e293b',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const isLeft = i < 6
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: 4 + (i % 3) * 2,
                    height: 4 + (i % 3) * 2,
                    borderRadius: '50%',
                    background: i % 2 === 0 ? '#ffd700' : '#b8860b',
                    left: isLeft ? `${8 + (i % 3) * 4}%` : `${82 + (i % 3) * 4}%`,
                    top: `${20 + (i % 4) * 18}%`,
                    boxShadow: `0 0 8px ${i % 2 === 0 ? '#ffd700' : '#b8860b'}`,
                    animation: `${isLeft ? 'driftLeft' : 'driftRight'} 2.5s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                    pointerEvents: 'none',
                  }}
                />
              )
            })}
            <div
              style={{
                fontSize: 36,
                marginBottom: 8,
              }}
            >
              ✨
            </div>
            <div
              style={{
                fontSize: 28,
                color: '#ffd700',
                fontWeight: 'bold',
                marginBottom: 8,
                textShadow: '0 0 12px rgba(255, 215, 0, 0.6)',
              }}
            >
              {reaction.recipe.name}
            </div>
            <div
              style={{
                fontSize: 18,
                color: '#a5d8ff',
                fontFamily: 'monospace',
                marginBottom: 16,
              }}
            >
              {reaction.recipe.formula}
            </div>
            <div
              style={{
                fontSize: 14,
                color: '#cbd5e1',
                lineHeight: 1.6,
                padding: '0 12px',
              }}
            >
              {reaction.recipe.description}
            </div>
            <button
              onClick={() => setReaction(null)}
              style={{
                marginTop: 20,
                padding: '8px 24px',
                borderRadius: 6,
                background: '#b8860b',
                color: '#ffffff',
                border: 'none',
                fontSize: 14,
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
              继续实验
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ControlButton({
  label,
  bg,
  active,
  onClick,
}: {
  label: string
  bg: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px',
        borderRadius: 8,
        background: active ? bg : `${bg}cc`,
        color: '#ffffff',
        border: `2px solid ${active ? '#ffd700' : '#b8860b'}`,
        fontSize: 14,
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        boxShadow: active ? `0 0 16px ${bg}` : 'none',
        fontFamily: 'inherit',
        minWidth: 90,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.boxShadow = `0 0 12px rgba(255, 215, 0, 0.6)`
        el.style.borderColor = '#ffd700'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.boxShadow = active ? `0 0 16px ${bg}` : 'none'
        el.style.borderColor = active ? '#ffd700' : '#b8860b'
      }}
    >
      {label}
    </button>
  )
}
