import { useCallback } from 'react'
import { useStore } from './store'
import { RotateCw, Gauge, Eye, Sparkles } from 'lucide-react'

function Slider({
  label,
  icon,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
}: {
  label: string
  icon: React.ReactNode
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  displayValue: string
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-white/70 text-xs">
          {icon}
          {label}
        </span>
        <span className="text-white/50 text-xs font-mono">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-white/10
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white/80
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.4)]
          [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:duration-200
          [&::-webkit-slider-thumb]:hover:bg-white
          [&::-webkit-slider-thumb]:hover:shadow-[0_0_12px_rgba(255,255,255,0.6)]
          [&::-moz-range-thumb]:w-3.5
          [&::-moz-range-thumb]:h-3.5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-none
          [&::-moz-range-thumb]:bg-white/80
        "
      />
    </div>
  )
}

function ControlPanel({ onResetCamera }: { onResetCamera: () => void }) {
  const rotationSpeed = useStore((s) => s.rotationSpeed)
  const fragmentOpacity = useStore((s) => s.fragmentOpacity)
  const refractionIntensity = useStore((s) => s.refractionIntensity)
  const setRotationSpeed = useStore((s) => s.setRotationSpeed)
  const setFragmentOpacity = useStore((s) => s.setFragmentOpacity)
  const setRefractionIntensity = useStore((s) => s.setRefractionIntensity)

  return (
    <div
      className="
        fixed bottom-5 right-5 z-50
        w-64 p-4 rounded-2xl
        bg-white/[0.06] backdrop-blur-xl
        border border-white/[0.08]
        shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]
        tablet:w-56 tablet:bottom-3 tablet:right-3 tablet:p-3
      "
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/90 text-sm font-medium tracking-wide">
          琉璃光界
        </h3>
        <button
          onClick={onResetCamera}
          className="
            flex items-center gap-1 px-2.5 py-1
            text-[10px] text-white/60
            bg-white/[0.06] hover:bg-white/[0.12]
            border border-white/[0.08] rounded-lg
            transition-all duration-200
            hover:text-white/90
          "
        >
          <RotateCw size={10} />
          重置视角
        </button>
      </div>

      <Slider
        label="旋转速度"
        icon={<Gauge size={12} />}
        value={rotationSpeed}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={setRotationSpeed}
        displayValue={`${rotationSpeed.toFixed(1)}x`}
      />

      <Slider
        label="碎片透明度"
        icon={<Eye size={12} />}
        value={fragmentOpacity}
        min={0.1}
        max={1.0}
        step={0.05}
        onChange={setFragmentOpacity}
        displayValue={`${Math.round(fragmentOpacity * 100)}%`}
      />

      <Slider
        label="折射强度"
        icon={<Sparkles size={12} />}
        value={refractionIntensity}
        min={0.0}
        max={2.0}
        step={0.1}
        onChange={setRefractionIntensity}
        displayValue={refractionIntensity.toFixed(1)}
      />
    </div>
  )
}

function FragmentInfoCard() {
  const hoveredFragment = useStore((s) => s.hoveredFragment)

  if (!hoveredFragment) return null

  const { screenPosition, color, colorName, thickness, refractionIndex } = hoveredFragment

  return (
    <div
      className="
        fixed z-50 pointer-events-none
        transition-all duration-200 ease-out
      "
      style={{
        left: screenPosition.x + 20,
        top: screenPosition.y - 40,
        opacity: hoveredFragment ? 1 : 0,
        transform: hoveredFragment ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(8px)',
      }}
    >
      <div
        className="
          p-3 rounded-xl min-w-[140px]
          bg-white/[0.08] backdrop-blur-xl
          border border-white/[0.1]
          shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]
        "
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-4 h-4 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]"
            style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}60` }}
          />
          <span className="text-white/90 text-xs font-medium">{colorName}</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-white/40 text-[10px]">厚度</span>
            <span className="text-white/70 text-[10px] font-mono">{thickness} mm</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/40 text-[10px]">折射率</span>
            <span className="text-white/70 text-[10px] font-mono">{refractionIndex}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UI({ onResetCamera }: { onResetCamera: () => void }) {
  const handleReset = useCallback(() => {
    onResetCamera()
  }, [onResetCamera])

  return (
    <>
      <ControlPanel onResetCamera={handleReset} />
      <FragmentInfoCard />
    </>
  )
}
