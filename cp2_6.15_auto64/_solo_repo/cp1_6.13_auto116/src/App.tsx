import { useEffect } from 'react'
import axios from 'axios'
import ScenePanel from './components/ScenePanel'
import ToolPanel from './components/ToolPanel'
import InfoPanel from './components/InfoPanel'
import MarkerLabel from './components/MarkerLabel'
import { useStore } from './store'
import type { Layer, Marker } from './types'

export default function App() {
  const { isMobile, setIsMobile, setLayers, setMarkers, setLoading } = useStore()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [layersRes, markersRes] = await Promise.all([
          axios.get<Layer[]>('/api/layers'),
          axios.get<Marker[]>('/api/markers'),
        ])
        setLayers(layersRes.data)
        setMarkers(markersRes.data)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [setLayers, setMarkers, setLoading])

  return (
    <div className="h-screen w-screen bg-[#0f0f0f] flex overflow-hidden">
      <div className="absolute top-4 left-4 z-30 pointer-events-none">
        <h1 className="text-xl font-bold text-white tracking-tight">
          虚拟地层剖面
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          三维重建与交互式探索 · 地质可视化
        </p>
      </div>

      <div className="absolute top-4 right-4 z-30 pointer-events-none">
        <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] text-slate-400 space-y-1">
          <p>🖱️ 拖拽旋转 · 滚轮缩放</p>
          <p>📍 Ctrl+点击添加标记</p>
        </div>
      </div>

      <div className="flex-1 flex">
        <ScenePanel />
      </div>

      <div className={`${isMobile ? 'hidden' : 'flex'} items-center p-4`}>
        <ToolPanel />
      </div>

      {isMobile && <ToolPanel />}

      <InfoPanel />
      <MarkerLabel />

      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(6, 182, 212, 0.03) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(236, 72, 153, 0.03) 0%, transparent 50%)',
        }}
      />
    </div>
  )
}
