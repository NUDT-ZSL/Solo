import { useEffect, useState } from 'react'
import { X, Calendar, Layers, Ruler, Shell } from 'lucide-react'
import { useStore } from '../store'

export default function InfoPanel() {
  const { selectedLayer, selectedLayerScreenPos, infoPanelVisible, isMobile, selectLayer } = useStore()
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (selectedLayerScreenPos) {
      const panelWidth = 240
      const panelHeight = 280
      const margin = 16

      let x = selectedLayerScreenPos.x + 16
      let y = selectedLayerScreenPos.y - panelHeight / 2

      if (x + panelWidth + margin > window.innerWidth) {
        x = selectedLayerScreenPos.x - panelWidth - 16
      }
      if (x < margin) x = margin
      if (y < margin) y = margin
      if (y + panelHeight + margin > window.innerHeight) {
        y = window.innerHeight - panelHeight - margin
      }

      setPosition({ x, y })
    }
  }, [selectedLayerScreenPos])

  if (!selectedLayer || !infoPanelVisible) return null

  if (isMobile) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => selectLayer(null)}
        />
        <div className="relative bg-[#1e293b]/95 backdrop-blur-xl rounded-t-3xl border-t border-slate-700/50 shadow-2xl p-5 pb-8">
          <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
          {renderContent()}
        </div>
      </div>
    )
  }

  function renderContent() {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">{selectedLayer.name}</h3>
            <div className="flex items-center gap-1 mt-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedLayer.color }}
              />
              <span className="text-xs text-slate-400">{selectedLayer.lithology}</span>
            </div>
          </div>
          <button
            onClick={() => selectLayer(null)}
            className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">地质年代</p>
              <p className="text-sm text-slate-200">{selectedLayer.age}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Layers className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">岩性描述</p>
              <p className="text-sm text-slate-200">{selectedLayer.description}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Ruler className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">厚度</p>
              <p className="text-sm text-slate-200">{selectedLayer.thickness.toFixed(2)} 单位</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Shell className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">发现化石</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedLayer.fossils.length > 0 ? (
                  selectedLayer.fossils.map((fossil, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-yellow-500/10 text-yellow-300 text-xs rounded-full border border-yellow-500/20"
                    >
                      {fossil}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">暂无化石记录</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed z-50 w-[240px] bg-[#1e293b]/90 backdrop-blur-xl rounded-xl p-4 shadow-2xl border border-slate-700/50 animate-fade-in"
      style={{
        left: position.x,
        top: position.y,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {renderContent()}
    </div>
  )
}
