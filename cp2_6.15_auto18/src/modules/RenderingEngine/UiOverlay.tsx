import React, { useState, useEffect, useRef } from 'react'
import type { Galaxy, GalaxyType, SimulationParams } from '../../constants'
import { GALAXY_PRESETS, DEFAULT_SIMULATION_PARAMS } from '../../constants'
import { Play, Pause, ChevronDown, ChevronRight, Sparkles, Plus, X, Trash2 } from 'lucide-react'

interface UiOverlayProps {
  galaxies: Galaxy[]
  selectedGalaxyIds: string[]
  params: SimulationParams
  paused: boolean
  placementMode: GalaxyType | null
  collisionActive: boolean
  totalParticles: number
  onTogglePause: () => void
  onSelectGalaxy: (id: string) => void
  onStartPlacement: (type: GalaxyType) => void
  onCancelPlacement: () => void
  onRemoveGalaxy: (id: string) => void
  onStartCollision: () => void
  onUpdateParams: (params: Partial<SimulationParams>) => void
  onReset: () => void
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  formatValue?: (v: number) => string
  onChange: (v: number) => void
}

function AnimatedSlider({ label, value, min, max, step, unit, formatValue, onChange }: SliderProps) {
  const [pulseKey, setPulseKey] = useState(0)
  const lastValueRef = useRef(value)

  useEffect(() => {
    if (Math.abs(value - lastValueRef.current) > 0.0001) {
      lastValueRef.current = value
      setPulseKey(k => k + 1)
    }
  }, [value])

  const percent = ((value - min) / (max - min)) * 100
  const display = formatValue ? formatValue(value) : `${value.toFixed(1)}${unit || ''}`

  return (
    <div style={{ marginBottom: 16, width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 6,
        position: 'relative',
      }}>
        <span style={{
          color: '#c8d4ff',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: 0.5,
        }}>
          {label}
        </span>
        <div
          key={pulseKey}
          style={{
            animation: 'sliderPulse 0.2s ease-out forwards',
            transformOrigin: 'center bottom',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 8px',
            borderRadius: 6,
            background: 'linear-gradient(135deg, rgba(68,136,255,0.35), rgba(108,168,255,0.25))',
            color: '#8cc8ff',
            fontSize: 12,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            border: '1px solid rgba(68,136,255,0.3)',
            backdropFilter: 'blur(8px)',
            minWidth: 40,
            textAlign: 'center',
          }}
        >
          {display}
        </div>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 4 }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: '#333',
          borderRadius: 2,
        }} />
        <div style={{
          position: 'absolute',
          top: 0, left: 0,
          width: `${percent}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #4488ff, #88bbff)',
          borderRadius: 2,
          transition: 'width 0.2s ease-out',
        }} />
        <div
          onPointerDown={(e) => {
            e.stopPropagation()
            const track = e.currentTarget.parentElement!
            const rect = track.getBoundingClientRect()
            const startX = e.clientX
            const startPercent = percent

            const move = (ev: PointerEvent) => {
              const dx = ev.clientX - startX
              const dp = (dx / rect.width) * (max - min)
              let nv = min + ((startPercent / 100) * (max - min)) + dp
              nv = Math.max(min, Math.min(max, nv))
              if (step) {
                nv = Math.round(nv / step) * step
                nv = parseFloat(nv.toFixed(10))
              }
              onChange(nv)
            }
            const up = () => {
              window.removeEventListener('pointermove', move)
              window.removeEventListener('pointerup', up)
            }
            window.addEventListener('pointermove', move)
            window.addEventListener('pointerup', up)
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: `${percent}%`,
            transform: 'translate(-50%, -50%)',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#4488ff',
            boxShadow: '0 0 12px rgba(68,136,255,0.7), 0 2px 6px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            transition: 'left 0.08s ease-out, box-shadow 0.15s ease-out',
            touchAction: 'none',
            border: '2px solid rgba(255,255,255,0.4)',
          }}
        />
      </div>
    </div>
  )
}

function GalaxyThumbnail({ type, colorRange }: { type: GalaxyType; colorRange: [string, string] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const w = c.width
    const h = c.height
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2, cy = h / 2
    if (type === 'spiral') {
      const arms = 2
      for (let i = 0; i < 120; i++) {
        const arm = i % arms
        const t = i / 120
        const theta = t * Math.PI * 4 + (arm / arms) * Math.PI * 2
        const r = Math.exp(t * 1.2) * 3
        const x = cx + r * Math.cos(theta)
        const y = cy + r * Math.sin(theta)
        const col = t
        const red = parseInt(colorRange[0].slice(1, 3), 16) + (parseInt(colorRange[1].slice(1, 3), 16) - parseInt(colorRange[0].slice(1, 3), 16)) * col
        const green = parseInt(colorRange[0].slice(3, 5), 16) + (parseInt(colorRange[1].slice(3, 5), 16) - parseInt(colorRange[0].slice(3, 5), 16)) * col
        const blue = parseInt(colorRange[0].slice(5, 7), 16) + (parseInt(colorRange[1].slice(5, 7), 16) - parseInt(colorRange[0].slice(5, 7), 16)) * col
        ctx.fillStyle = `rgb(${red|0},${green|0},${blue|0})`
        ctx.beginPath()
        ctx.arc(x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2, 1.1, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (type === 'elliptical') {
      for (let i = 0; i < 150; i++) {
        const a = Math.random() * Math.PI * 2
        const r = Math.pow(Math.random(), 2) * 16
        const x = cx + r * Math.cos(a)
        const y = cy + r * Math.sin(a) * 0.7
        const t = Math.min(1, r / 16)
        const red = parseInt(colorRange[0].slice(1, 3), 16) + (parseInt(colorRange[1].slice(1, 3), 16) - parseInt(colorRange[0].slice(1, 3), 16)) * t
        const green = parseInt(colorRange[0].slice(3, 5), 16) + (parseInt(colorRange[1].slice(3, 5), 16) - parseInt(colorRange[0].slice(3, 5), 16)) * t
        const blue = parseInt(colorRange[0].slice(5, 7), 16) + (parseInt(colorRange[1].slice(5, 7), 16) - parseInt(colorRange[0].slice(5, 7), 16)) * t
        ctx.fillStyle = `rgb(${red|0},${green|0},${blue|0})`
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      for (let i = 0; i < 100; i++) {
        const cl = 2 + Math.floor(Math.random() * 3)
        const clx = cx + (Math.random() - 0.5) * 20
        const cly = cy + (Math.random() - 0.5) * 18
        const a = Math.random() * Math.PI * 2
        const r = Math.random() * 6
        const x = clx + r * Math.cos(a)
        const y = cly + r * Math.sin(a)
        const t = Math.random()
        const red = parseInt(colorRange[0].slice(1, 3), 16) + (parseInt(colorRange[1].slice(1, 3), 16) - parseInt(colorRange[0].slice(1, 3), 16)) * t
        const green = parseInt(colorRange[0].slice(3, 5), 16) + (parseInt(colorRange[1].slice(3, 5), 16) - parseInt(colorRange[0].slice(3, 5), 16)) * t
        const blue = parseInt(colorRange[0].slice(5, 7), 16) + (parseInt(colorRange[1].slice(5, 7), 16) - parseInt(colorRange[0].slice(5, 7), 16)) * t
        ctx.fillStyle = `rgb(${red|0},${green|0},${blue|0})`
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18)
    grd.addColorStop(0, `rgba(${parseInt(colorRange[0].slice(1, 3), 16)},${parseInt(colorRange[0].slice(3, 5), 16)},${parseInt(colorRange[0].slice(5, 7), 16)},0.2)`)
    grd.addColorStop(1, 'transparent')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(cx, cy, 18, 0, Math.PI * 2)
    ctx.fill()
  }, [type, colorRange])
  return (
    <canvas
      ref={ref}
      width={40}
      height={40}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(0,0,20,0.6)',
        flexShrink: 0,
      }}
    />
  )
}

function GalaxyItem({
  galaxy,
  selected,
  onSelect,
  onRemove,
}: {
  galaxy: Galaxy
  selected: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: 160,
        height: 60,
        borderRadius: 6,
        padding: '0 8px',
        gap: 8,
        cursor: 'pointer',
        position: 'relative',
        background: 'rgba(26,26,58,0.5)',
        backdropFilter: 'blur(10px)',
        border: selected ? '1.5px solid #4488ff' : '1px solid rgba(80,100,160,0.3)',
        boxShadow: selected
          ? '0 0 16px rgba(68,136,255,0.5), inset 0 0 12px rgba(68,136,255,0.15)'
          : '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease-out',
        marginBottom: 10,
      }}
    >
      <GalaxyThumbnail type={galaxy.type} colorRange={galaxy.colorRange} />
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <div style={{
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {galaxy.name}
        </div>
        <div style={{
          color: '#8090b8',
          fontSize: 10,
          marginTop: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {galaxy.particleCount} 粒子
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        title="移除星系"
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          border: 'none',
          background: 'rgba(255,80,80,0.15)',
          color: '#ff8888',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: 0.8,
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,80,80,0.35)'
          ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,80,80,0.15)'
          ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.8'
        }}
      >
        <X size={12} />
      </button>
    </div>
  )
}

export function CollisionPulse({ active }: { active: boolean }) {
  const [showKey, setShowKey] = useState(0)
  useEffect(() => {
    if (active) setShowKey(k => k + 1)
  }, [active])
  if (!active && showKey === 0) return null
  return (
    <div key={showKey} style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 10000,
    }}>
      <div style={{
        width: 0,
        height: 0,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(120,180,255,0.6) 0%, rgba(120,180,255,0.15) 40%, transparent 70%)',
        animation: 'collisionPulse 0.8s ease-out forwards',
      }} />
    </div>
  )
}

export function UiOverlay(props: UiOverlayProps) {
  const {
    galaxies, selectedGalaxyIds, params, paused, placementMode,
    totalParticles, onTogglePause, onSelectGalaxy,
    onStartPlacement, onCancelPlacement, onRemoveGalaxy,
    onStartCollision, onUpdateParams, onReset,
  } = props

  const [paramsPanelOpen, setParamsPanelOpen] = useState(true)
  const [galaxyPresetMenuOpen, setGalaxyPresetMenuOpen] = useState(false)

  const canCollide = selectedGalaxyIds.length === 2 && !placementMode

  return (
    <>
      <style>{`
        @keyframes sliderPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        @keyframes collisionPulse {
          0% { width: 0; height: 0; opacity: 0.6; }
          100% { width: 200px; height: 200px; opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        left: 20,
        bottom: 20,
        zIndex: 100,
      }}>
        <div style={{
          marginBottom: 14,
          animation: 'fadeIn 0.4s ease-out both',
        }}>
          <button
            onClick={() => setGalaxyPresetMenuOpen(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid rgba(68,136,255,0.4)',
              background: 'linear-gradient(135deg, rgba(68,136,255,0.25), rgba(120,80,200,0.2))',
              backdropFilter: 'blur(12px)',
              color: '#c8d4ff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease-out',
              boxShadow: '0 4px 16px rgba(68,136,255,0.15)',
            }}
          >
            <Plus size={16} color="#88bbff" />
            <span>选择星系类型</span>
            {galaxyPresetMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {galaxyPresetMenuOpen && (
            <div style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 10,
              background: 'rgba(26,26,58,0.75)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(80,100,160,0.3)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              animation: 'fadeIn 0.25s ease-out both',
              width: 210,
            }}>
              {GALAXY_PRESETS.map(preset => (
                <button
                  key={preset.type}
                  onClick={() => {
                    onStartPlacement(preset.type)
                    setGalaxyPresetMenuOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: placementMode === preset.type
                      ? 'rgba(68,136,255,0.25)'
                      : 'rgba(50,60,100,0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (placementMode !== preset.type)
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(68,136,255,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    if (placementMode !== preset.type)
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(50,60,100,0.3)'
                  }}
                >
                  <GalaxyThumbnail type={preset.type} colorRange={preset.colorRange} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#ffffff', fontSize: 12, fontWeight: 600 }}>{preset.name}</div>
                    <div style={{ color: '#8090b8', fontSize: 10, marginTop: 1 }}>
                      {preset.defaultParticleCount} 粒子
                    </div>
                  </div>
                </button>
              ))}
              {placementMode && (
                <button
                  onClick={onCancelPlacement}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,120,120,0.3)',
                    background: 'rgba(255,80,80,0.15)',
                    color: '#ffaaaa',
                    fontSize: 11,
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  取消放置 (点击三维空间放置星系)
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{
            color: '#8090b8',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: 8,
            paddingLeft: 4,
          }}>
            场景星系 ({galaxies.length})
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
            {galaxies.length === 0 && (
              <div style={{
                width: 160,
                padding: '16px 8px',
                borderRadius: 6,
                border: '1px dashed rgba(80,100,160,0.35)',
                background: 'rgba(26,26,58,0.3)',
                color: '#8090b8',
                fontSize: 11,
                textAlign: 'center',
              }}>
                尚未放置星系<br />
                <span style={{ color: '#6070a0', fontSize: 10 }}>
                  请从上方"选择星系类型"开始
                </span>
              </div>
            )}
            {galaxies.map(g => (
              <GalaxyItem
                key={g.id}
                galaxy={g}
                selected={selectedGalaxyIds.includes(g.id)}
                onSelect={() => onSelectGalaxy(g.id)}
                onRemove={() => onRemoveGalaxy(g.id)}
              />
            ))}
          </div>
        </div>

        {canCollide && (
          <button
            onClick={onStartCollision}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #ff6666, #ff9944)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(255,100,100,0.4)',
              animation: 'fadeIn 0.3s ease-out both',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          >
            <Sparkles size={16} />
            融合已选 2 个星系
          </button>
        )}
      </div>

      <div style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 100,
      }}>
        <div style={{
          width: 220,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(150,170,220,0.15)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          animation: 'fadeIn 0.4s ease-out both',
        }}>
          <button
            onClick={() => setParamsPanelOpen(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'linear-gradient(90deg, rgba(68,136,255,0.15), rgba(180,120,255,0.08))',
              border: 'none',
              color: '#c8d4ff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
              borderBottom: paramsPanelOpen ? '1px solid rgba(150,170,220,0.12)' : 'none',
            }}
          >
            <span>⚙  参数控制</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                color: '#8090b8',
                fontSize: 10,
                fontWeight: 500,
              }}>
                {totalParticles} 粒子
              </span>
              {paramsPanelOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          </button>

          {paramsPanelOpen && (
            <div style={{ padding: '14px 14px 10px 14px' }}>
              <AnimatedSlider
                label="引力常数"
                value={params.gravityConstant}
                min={0.1}
                max={5.0}
                step={0.1}
                onChange={v => onUpdateParams({ gravityConstant: v })}
                formatValue={v => v.toFixed(1)}
              />
              <AnimatedSlider
                label="弹性系数"
                value={params.elasticity}
                min={0.0}
                max={1.0}
                step={0.05}
                onChange={v => onUpdateParams({ elasticity: v })}
                formatValue={v => v.toFixed(2)}
              />
              <AnimatedSlider
                label="模拟速度"
                value={params.simulationSpeed}
                min={0.5}
                max={5.0}
                step={0.1}
                onChange={v => onUpdateParams({ simulationSpeed: v })}
                formatValue={v => `${v.toFixed(1)}x`}
              />

              <div style={{
                display: 'flex',
                gap: 8,
                marginTop: 8,
              }}>
                <button
                  onClick={onTogglePause}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(150,170,220,0.2)',
                    background: paused
                      ? 'linear-gradient(135deg, rgba(68,255,136,0.25), rgba(68,200,160,0.15))'
                      : 'rgba(80,100,160,0.2)',
                    color: paused ? '#aaffcc' : '#c8d4ff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {paused ? <Play size={12} /> : <Pause size={12} />}
                  {paused ? '继续' : '暂停'}
                </button>
                <button
                  onClick={onReset}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,120,120,0.25)',
                    background: 'rgba(255,80,80,0.12)',
                    color: '#ffaaaa',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Trash2 size={12} />
                  重置
                </button>
              </div>

              <div style={{
                marginTop: 10,
                padding: '6px 10px',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.2)',
                color: '#8090b8',
                fontSize: 10,
                lineHeight: 1.5,
              }}>
                <div>💡 操作提示：</div>
                <div>• 鼠标左键拖拽旋转视角</div>
                <div>• 滚轮缩放 • 中键平移</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {placementMode && (
        <div style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          padding: '10px 20px',
          borderRadius: 30,
          background: 'linear-gradient(135deg, rgba(68,136,255,0.35), rgba(120,80,200,0.3))',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(120,180,255,0.4)',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 600,
          animation: 'fadeIn 0.3s ease-out both',
          boxShadow: '0 8px 30px rgba(68,136,255,0.3)',
        }}>
          📍 正在放置 {GALAXY_PRESETS.find(p => p.type === placementMode)?.name} · 点击三维空间放置 · 右键或 Esc 取消
        </div>
      )}
    </>
  )
}
