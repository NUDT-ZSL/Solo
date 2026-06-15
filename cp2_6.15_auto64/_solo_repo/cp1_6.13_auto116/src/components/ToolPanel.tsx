import { useState } from 'react'
import { Play, Shell, Calendar, MapPin, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import type { Marker } from '../types'
import axios from 'axios'

export default function ToolPanel() {
  const {
    layers,
    markers,
    eraSliderValue,
    showFossils,
    isDepositing,
    isMobile,
    setEraSliderValue,
    setShowFossils,
    startDeposition,
    deleteMarker,
  } = useStore()

  const [tooltip, setTooltip] = useState<string | null>(null)

  const maxEraIndex = layers.length > 0 ? Math.max(...layers.map(l => l.eraIndex)) : 12
  const currentEra = eraSliderValue > 0 ? Math.floor(eraSliderValue * maxEraIndex) : -1

  const handleDeleteMarker = async (marker: Marker) => {
    try {
      await axios.delete(`/api/markers/${marker.id}`)
      deleteMarker(marker.id)
    } catch (error) {
      console.error('Failed to delete marker:', error)
    }
  }

  const getEraName = (index: number) => {
    if (index < 0) return '全部'
    const eras = ['寒武纪', '奥陶纪', '志留纪', '泥盆纪', '石炭纪', '二叠纪', '三叠纪', '侏罗纪', '白垩纪', '白垩纪晚期', '古近纪', '新近纪', '第四纪']
    return eras[index] || '未知'
  }

  const EraSlider = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <label className="text-sm font-medium text-slate-200">年代筛选</label>
        <span
          className="text-xs text-slate-400 ml-auto"
          onMouseEnter={() => setTooltip('拖动滑块高亮对应年代的地层')}
          onMouseLeave={() => setTooltip(null)}
        >
          {getEraName(currentEra)}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={eraSliderValue}
        onChange={(e) => setEraSliderValue(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 transition-all duration-300"
        style={{
          background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${eraSliderValue * 100}%, #334155 ${eraSliderValue * 100}%, #334155 100%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>古生代</span>
        <span>中生代</span>
        <span>新生代</span>
      </div>
    </div>
  )

  const FossilToggle = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Shell className="w-4 h-4 text-slate-400" />
        <span
          className="text-sm font-medium text-slate-200"
          onMouseEnter={() => setTooltip('显示/隐藏地层内的化石模型')}
          onMouseLeave={() => setTooltip(null)}
        >
          显示化石
        </span>
      </div>
      <button
        onClick={() => setShowFossils(!showFossils)}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 ease-out ${
          showFossils ? 'bg-cyan-600' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ease-out shadow-lg ${
            showFossils ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )

  const DepositButton = () => (
    <button
      onClick={startDeposition}
      disabled={isDepositing}
      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-300 ease-out font-medium text-sm ${
        isDepositing
          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98]'
      }`}
      onMouseEnter={() => !isDepositing && setTooltip('从底层开始模拟沉积过程')}
      onMouseLeave={() => setTooltip(null)}
    >
      <Play className={`w-4 h-4 ${isDepositing ? 'animate-pulse' : ''}`} />
      {isDepositing ? '模拟中...' : '沉积过程模拟'}
    </button>
  )

  const MarkerList = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-slate-400" />
        <label className="text-sm font-medium text-slate-200">标记列表</label>
        <span className="text-xs text-slate-500 ml-auto">{markers.length} 个标记</span>
      </div>
      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
        {markers.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            按住 Ctrl + 点击地层表面添加标记
          </p>
        ) : (
          markers.map((marker) => (
            <div
              key={marker.id}
              className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg group hover:bg-slate-800 transition-colors duration-200"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{marker.label}</p>
                <p className="text-[10px] text-slate-500">
                  ({marker.position.x.toFixed(1)}, {marker.position.y.toFixed(1)}, {marker.position.z.toFixed(1)})
                </p>
              </div>
              <button
                onClick={() => handleDeleteMarker(marker)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all duration-200"
                onMouseEnter={() => setTooltip('删除此标记')}
                onMouseLeave={() => setTooltip(null)}
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <>
      {tooltip && (
        <div className="fixed z-50 px-3 py-2 bg-slate-900 text-white text-xs rounded-md shadow-xl pointer-events-none animate-fade-in backdrop-blur-sm border border-slate-700">
          {tooltip}
        </div>
      )}

      {isMobile ? (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#0f172a]/95 backdrop-blur-lg border-t border-slate-700/50 overflow-x-auto px-4 py-2 flex items-center gap-4 z-40">
          <div className="flex-shrink-0 w-48">
            <EraSlider />
          </div>
          <div className="h-10 w-px bg-slate-700/50 flex-shrink-0" />
          <div className="flex-shrink-0">
            <FossilToggle />
          </div>
          <div className="h-10 w-px bg-slate-700/50 flex-shrink-0" />
          <div className="flex-shrink-0 w-40">
            <DepositButton />
          </div>
          <div className="h-10 w-px bg-slate-700/50 flex-shrink-0" />
          <div className="flex-shrink-0 w-40">
            <p className="text-xs text-slate-400 mb-1">标记: {markers.length}</p>
          </div>
        </div>
      ) : (
        <div className="w-[280px] bg-[#0f172a]/85 backdrop-blur-lg rounded-2xl p-5 shadow-2xl border border-slate-700/50 flex flex-col gap-5 z-40">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">地质工具</h2>
            <p className="text-xs text-slate-400">探索和分析地层剖面</p>
          </div>

          <div className="h-px bg-slate-700/50" />

          <EraSlider />

          <div className="h-px bg-slate-700/50" />

          <FossilToggle />

          <div className="h-px bg-slate-700/50" />

          <DepositButton />

          <div className="h-px bg-slate-700/50" />

          <MarkerList />

          <div className="mt-auto pt-4 border-t border-slate-700/50">
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
              <div>
                <p className="text-slate-400">层数</p>
                <p className="text-slate-200 font-medium">{layers.length} 层</p>
              </div>
              <div>
                <p className="text-slate-400">总厚度</p>
                <p className="text-slate-200 font-medium">
                  {layers.reduce((sum, l) => sum + l.thickness, 0).toFixed(2)} 单位
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
