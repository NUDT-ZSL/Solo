import { useRef } from 'react'
import {
  Compass,
  Download,
  Heart,
  Sun,
  Sparkles,
  Palette,
} from 'lucide-react'
import { useCanvasStore, BRUSH_COLORS } from '@/hooks/useCanvasStore'
import { saveCanvasAsPNG } from '@/utils/canvasUtils'

export default function ControlPanel() {
  const brushColor = useCanvasStore((s) => s.brushColor)
  const brushSize = useCanvasStore((s) => s.brushSize)
  const glowMode = useCanvasStore((s) => s.glowMode)
  const setBrushColor = useCanvasStore((s) => s.setBrushColor)
  const setBrushSize = useCanvasStore((s) => s.setBrushSize)
  const setGlowMode = useCanvasStore((s) => s.setGlowMode)
  const discoverNewRegion = useCanvasStore((s) => s.discoverNewRegion)
  const likeRegion = useCanvasStore((s) => s.likeRegion)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const handleSave = () => {
    const canvases = document.querySelectorAll('canvas')
    const bgCanvas = canvases[0]
    const fgCanvas = canvases[1]
    if (!bgCanvas || !fgCanvas) return

    const merged = document.createElement('canvas')
    merged.width = bgCanvas.width
    merged.height = bgCanvas.height
    const ctx = merged.getContext('2d')
    if (!ctx) return

    ctx.drawImage(bgCanvas, 0, 0)
    ctx.drawImage(fgCanvas, 0, 0)
    saveCanvasAsPNG(merged)
  }

  return (
    <div className="glass-panel p-4 w-64 animate-slide-in-left flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <Palette size={20} className="text-coral-500" />
        <h2 className="font-display font-bold text-lg text-white glow-text">画笔工具</h2>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-body text-white/80 font-semibold tracking-wide uppercase">
          颜色
        </label>
        <div className="grid grid-cols-6 gap-2">
          {BRUSH_COLORS.map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                brushColor === color
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-white/30 hover:scale-110 hover:border-white/60'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setBrushColor(color)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-body text-white/80 font-semibold tracking-wide uppercase">
            大小
          </label>
          <span className="text-xs font-body text-white/60">{brushSize}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="30"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #FF7F50 0%, #FF7F50 ${((brushSize - 1) / 29) * 100}%, rgba(255,255,255,0.2) ${((brushSize - 1) / 29) * 100}%, rgba(255,255,255,0.2) 100%)`,
          }}
        />
        <div className="flex justify-center">
          <div
            className="rounded-full transition-all duration-200"
            style={{
              width: Math.max(brushSize, 4),
              height: Math.max(brushSize, 4),
              backgroundColor: brushColor,
              boxShadow: glowMode ? `0 0 ${brushSize * 2}px ${brushColor}` : 'none',
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <button
          className={`glass-button w-full py-2.5 px-4 flex items-center gap-3 font-body font-semibold text-sm transition-all ${
            glowMode
              ? 'text-coral-500 bg-white/30'
              : 'text-white/80'
          }`}
          onClick={() => setGlowMode(!glowMode)}
        >
          <Sparkles size={18} className={glowMode ? 'text-coral-500 animate-glow-pulse' : ''} />
          <span>{glowMode ? '发光笔刷 · 已开启' : '发光笔刷'}</span>
        </button>
      </div>

      <div className="border-t border-white/15 pt-3 space-y-2">
        <button
          className="glass-button w-full py-2.5 px-4 flex items-center gap-3 font-body font-semibold text-sm text-white/90 hover:text-coral-500"
          onClick={discoverNewRegion}
        >
          <Compass size={18} />
          <span>发现新岛屿</span>
        </button>

        <button
          className="glass-button w-full py-2.5 px-4 flex items-center gap-3 font-body font-semibold text-sm text-white/90 hover:text-coral-500"
          onClick={handleSave}
        >
          <Download size={18} />
          <span>保存画作</span>
        </button>

        <button
          className="glass-button w-full py-2.5 px-4 flex items-center gap-3 font-body font-semibold text-sm text-white/90 hover:text-pink-400"
          onClick={likeRegion}
        >
          <Heart size={18} />
          <span>点亮区域</span>
        </button>
      </div>
    </div>
  )
}
