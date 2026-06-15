import { useStore } from '@/store'
import { RotateCcw } from 'lucide-react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  unit?: string
}

function Slider({ label, value, min, max, step, onChange, unit = '' }: SliderProps) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-white/70 tracking-wide">{label}</span>
        <span className="text-xs font-mono text-cyan-300/90">
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer
          bg-white/10
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-cyan-400
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.6)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-3
          [&::-moz-range-thumb]:h-3
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-cyan-400
          [&::-moz-range-thumb]:border-none
          [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.6)]
          [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  )
}

export default function ControlPanel({ onReset }: { onReset: () => void }) {
  const {
    meteorFrequency,
    trailLifetime,
    autoRotateSpeed,
    setMeteorFrequency,
    setTrailLifetime,
    setAutoRotateSpeed,
    resetAll,
  } = useStore()

  const handleReset = () => {
    resetAll()
    onReset()
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-64 p-5 rounded-2xl
        bg-white/[0.04] backdrop-blur-xl
        border border-white/[0.08]
        shadow-[0_0_40px_rgba(34,211,238,0.05)]
        transition-all duration-300"
    >
      <h3
        className="text-sm font-medium text-white/90 mb-4 tracking-widest uppercase
          font-[Orbitron,monospace]"
      >
        控制面板
      </h3>

      <Slider
        label="流星频率"
        value={meteorFrequency}
        min={1}
        max={20}
        step={0.5}
        onChange={setMeteorFrequency}
        unit="/s"
      />
      <Slider
        label="拖尾寿命"
        value={trailLifetime}
        min={1}
        max={10}
        step={0.5}
        onChange={setTrailLifetime}
        unit="s"
      />
      <Slider
        label="旋转速度"
        value={autoRotateSpeed}
        min={0}
        max={5}
        step={0.1}
        onChange={setAutoRotateSpeed}
      />

      <button
        onClick={handleReset}
        className="mt-4 w-full py-2 rounded-lg
          bg-white/[0.06] hover:bg-cyan-500/20
          border border-white/[0.1] hover:border-cyan-400/30
          text-white/70 hover:text-cyan-300
          text-xs tracking-wider uppercase
          transition-all duration-200
          flex items-center justify-center gap-2
          font-[Orbitron,monospace]"
      >
        <RotateCcw size={12} />
        重置星轨
      </button>
    </div>
  )
}
