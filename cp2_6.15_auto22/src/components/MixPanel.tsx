import { usePerfumeStore } from '@/stores/perfumeStore'
import { FlaskConical, Trash2, Minus, Plus } from 'lucide-react'

export default function MixPanel() {
  const { selectedAromas, updateRatio, removeAroma, mix, reset } = usePerfumeStore()

  const totalRatio = selectedAromas.reduce((sum, s) => sum + s.ratio, 0)

  const handleSliderChange = (aromaId: number, value: number) => {
    updateRatio(aromaId, value / 100)
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ width: 300, minHeight: '100%' }}
    >
      <h2 className="text-2xl font-serif mb-4 text-amber-800 tracking-wider">调香配方</h2>

      {selectedAromas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-amber-600/60 py-12">
          <FlaskConical size={48} strokeWidth={1} className="mb-3 opacity-40" />
          <p className="text-sm">点击轮盘中的香味添加到配方</p>
        </div>
      ) : (
        <>
          <div
            className="w-full h-6 rounded-full overflow-hidden mb-4 flex"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          >
            {selectedAromas.map((s) => (
              <div
                key={s.aroma.id}
                className="h-full transition-all duration-300"
                style={{
                  width: `${(s.ratio / totalRatio) * 100}%`,
                  background: s.aroma.color,
                }}
              />
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {selectedAromas.map((s) => (
              <div
                key={s.aroma.id}
                className="p-3 rounded-xl"
                style={{
                  background: '#fff',
                  border: '1px solid #e0c8a0',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ background: s.aroma.color }}
                    />
                    <span className="text-sm font-medium text-amber-900">
                      {s.aroma.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-600">
                      {Math.round((s.ratio / totalRatio) * 100)}%
                    </span>
                    <button
                      onClick={() => removeAroma(s.aroma.id)}
                      className="text-amber-400 hover:text-red-400 transition-colors p-0.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleSliderChange(s.aroma.id, Math.max(1, (s.ratio / totalRatio) * 100 - 5) * (totalRatio / s.ratio > 0 ? 1 : 1))
                    }
                    className="w-6 h-6 rounded-full flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors"
                    style={{ border: '1px solid #e0c8a0' }}
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={Math.round((s.ratio / totalRatio) * 100)}
                    onChange={(e) => handleSliderChange(s.aroma.id, Number(e.target.value))}
                    className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${s.aroma.color} 0%, ${s.aroma.color} ${Math.round((s.ratio / totalRatio) * 100)}%, #e0c8a0 ${Math.round((s.ratio / totalRatio) * 100)}%, #e0c8a0 100%)`,
                    }}
                  />
                  <button
                    onClick={() =>
                      handleSliderChange(s.aroma.id, Math.min(100, (s.ratio / totalRatio) * 100 + 5) * (totalRatio / s.ratio > 0 ? 1 : 1))
                    }
                    className="w-6 h-6 rounded-full flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors"
                    style={{ border: '1px solid #e0c8a0' }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <button
              onClick={mix}
              className="perfume-btn w-full py-3 rounded-xl text-white font-medium text-base tracking-wider transition-all duration-200 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #ff9933, #ff6600)',
                boxShadow: '0 4px 12px rgba(255,102,0,0.3)',
              }}
            >
              🧪 混合调香
            </button>
            <button
              onClick={reset}
              className="w-full py-2 rounded-xl text-amber-600 text-sm transition-all duration-200 hover:bg-amber-50"
              style={{ border: '1px solid #e0c8a0' }}
            >
              清空配方
            </button>
          </div>
        </>
      )}
    </div>
  )
}
