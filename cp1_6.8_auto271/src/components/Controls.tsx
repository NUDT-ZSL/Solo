import { useStore, type AnimationStyle } from '@/store/useStore'
import {
  Snowflake,
  Waves,
  Bomb,
  Loader,
  Merge,
  Split,
} from 'lucide-react'

const STYLES: { key: AnimationStyle; label: string; icon: React.ReactNode }[] = [
  { key: 'fall', label: '飘落', icon: <Snowflake size={16} /> },
  { key: 'ripple', label: '涟漪', icon: <Waves size={16} /> },
  { key: 'explode', label: '爆炸', icon: <Bomb size={16} /> },
  { key: 'spiral', label: '螺旋', icon: <Loader size={16} /> },
]

const PRESET_COLORS = [
  '#D4A574',
  '#E8B4B8',
  '#7EB5A6',
  '#8B7EC8',
  '#5B8FB9',
  '#D4956A',
]

export default function Controls() {
  const text = useStore((s) => s.text)
  const style = useStore((s) => s.style)
  const speed = useStore((s) => s.speed)
  const particleSize = useStore((s) => s.particleSize)
  const color = useStore((s) => s.color)
  const isDissolving = useStore((s) => s.isDissolving)
  const setText = useStore((s) => s.setText)
  const setStyle = useStore((s) => s.setStyle)
  const setSpeed = useStore((s) => s.setSpeed)
  const setParticleSize = useStore((s) => s.setParticleSize)
  const setColor = useStore((s) => s.setColor)
  const toggleDissolve = useStore((s) => s.toggleDissolve)

  return (
    <div className="controls-panel">
      <div className="space-y-4">
        <div>
          <label className="control-label">文字</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入文字，开始动画…"
            rows={2}
            className="control-textarea"
          />
        </div>

        <div>
          <label className="control-label">动画风格</label>
          <div className="flex gap-2 flex-wrap">
            {STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStyle(s.key)}
                className={`style-btn ${style === s.key ? 'style-btn-active' : ''}`}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="control-label">
            速度 <span className="text-xs opacity-60">{speed.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="control-range"
          />
        </div>

        <div>
          <label className="control-label">
            粒子大小 <span className="text-xs opacity-60">{particleSize.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={particleSize}
            onChange={(e) => setParticleSize(parseFloat(e.target.value))}
            className="control-range"
          />
        </div>

        <div>
          <label className="control-label">颜色</label>
          <div className="flex gap-2 items-center flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`color-dot ${color === c ? 'color-dot-active' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="color-picker"
            />
          </div>
        </div>

        <button onClick={toggleDissolve} className="dissolve-btn">
          {isDissolving ? (
            <>
              <Merge size={16} />
              <span>重组</span>
            </>
          ) : (
            <>
              <Split size={16} />
              <span>消散</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
