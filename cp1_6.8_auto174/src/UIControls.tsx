import { useSimStore, type StarInfo } from '@/store'
import { RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] uppercase tracking-widest text-indigo-300/80 font-medium">
          {label}
        </span>
        <span className="text-[11px] text-white/50 tabular-nums font-mono">
          {value.toFixed(step < 1 ? 1 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="star-slider w-full"
      />
    </div>
  )
}

function StarInfoCard({ info, onClose }: { info: StarInfo; onClose: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 300)
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`glass-card rounded-2xl p-6 w-[340px] transition-all duration-300 ${
          visible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3
            className="text-lg font-bold tracking-wider"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            恒星核数据
          </h3>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <DataRow label="质量" value={`${info.mass} M☉`} icon="◈" />
          <DataRow label="表面温度" value={`${info.temperature.toLocaleString()} K`} icon="◉" />
          <DataRow label="预估寿命" value={`${Number(info.lifespan).toLocaleString()} 百万年`} icon="◎" />
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <div className="text-[10px] text-white/25 uppercase tracking-widest">
            坐标位置
          </div>
          <div className="text-xs text-white/40 font-mono mt-1">
            X: {info.position.x.toFixed(2)} &nbsp; Y: {info.position.y.toFixed(2)} &nbsp; Z: {info.position.z.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}

function DataRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
      <span className="text-amber-400/70 text-sm">{icon}</span>
      <span className="text-[11px] text-indigo-200/60 uppercase tracking-wider flex-1">{label}</span>
      <span className="text-sm text-white/90 font-mono">{value}</span>
    </div>
  )
}

export function UIControls() {
  const {
    gravityStrength,
    particleDensity,
    glowIntensity,
    setGravityStrength,
    setParticleDensity,
    setGlowIntensity,
    triggerResetCamera,
    activeStarInfo,
    setActiveStarInfo,
  } = useSimStore()

  const [panelCollapsed, setPanelCollapsed] = useState(false)

  return (
    <>
      <div
        className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${
          panelCollapsed ? 'translate-x-[calc(100%+1.5rem)]' : ''
        }`}
      >
        <div className="glass-card rounded-2xl p-5 w-[260px]">
          <h3
            className="text-sm font-bold tracking-widest text-indigo-200/90 mb-4 pb-3 border-b border-white/[0.06]"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            控制面板
          </h3>

          <div className="space-y-4">
            <Slider
              label="引力强度"
              value={gravityStrength}
              min={0.1}
              max={5}
              step={0.1}
              onChange={setGravityStrength}
            />
            <Slider
              label="粒子密度"
              value={particleDensity}
              min={1000}
              max={8000}
              step={100}
              onChange={setParticleDensity}
            />
            <Slider
              label="光晕强度"
              value={glowIntensity}
              min={0.1}
              max={3}
              step={0.1}
              onChange={setGlowIntensity}
            />
          </div>

          <button
            onClick={() => {
              triggerResetCamera()
            }}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/20 hover:border-indigo-400/40 text-indigo-200/80 hover:text-indigo-100 text-xs uppercase tracking-widest transition-all"
          >
            <RotateCcw size={14} />
            重置视角
          </button>
        </div>
      </div>

      <button
        onClick={() => setPanelCollapsed(!panelCollapsed)}
        className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full glass-card flex items-center justify-center text-indigo-300/80 hover:text-indigo-200 transition-all"
        style={{ display: panelCollapsed ? 'flex' : 'none' }}
      >
        ☰
      </button>

      {activeStarInfo && (
        <StarInfoCard info={activeStarInfo} onClose={() => setActiveStarInfo(null)} />
      )}
    </>
  )
}
