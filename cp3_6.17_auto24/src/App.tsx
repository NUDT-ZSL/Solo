import { useEffect } from 'react'
import VideoUploader from './VideoUploader'
import VideoPlayer from './VideoPlayer'
import MarkerPanel from './MarkerPanel'
import TimelineExporter from './TimelineExporter'
import { useAppStore } from './store'
import type { Video, Marker } from './types'

export default function App() {
  const { setVideos, setMarkers } = useAppStore()

  useEffect(() => {
    const loadData = async () => {
      try {
        const [videosRes, markersRes] = await Promise.all([
          fetch('/api/videos'),
          fetch('/api/markers'),
        ])
        if (videosRes.ok) {
          const videos: Video[] = await videosRes.json()
          setVideos(videos)
        }
        if (markersRes.ok) {
          const markers: Marker[] = await markersRes.json()
          setMarkers(markers)
        }
      } catch (err) {
        console.error('加载数据失败:', err)
      }
    }
    loadData()
  }, [setVideos, setMarkers])

  return (
    <div className="w-full h-full flex bg-bg-primary text-text-primary">
      <div className="flex-1 p-6 overflow-hidden flex flex-col" style={{ width: 'calc(100% - 240px)' }}>
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">ClipMarker</h1>
              <p className="text-xs text-text-secondary">视频素材标记与时间线导出工具</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <VideoUploader />
        </div>
      </div>

      <div className="flex flex-col border-l border-bg-secondary" style={{ width: '240px', flexShrink: 0 }}>
        <div className="flex-1 overflow-hidden">
          <MarkerPanel />
        </div>
        <div className="p-3 bg-bg-tertiary border-t border-bg-secondary">
          <TimelineExporter />
        </div>
      </div>

      <VideoPlayer />

      <style>{`
        @media (max-width: 768px) {
          .w-full.h-full.flex {
            flex-direction: column !important;
          }
          .flex-1.p-6 {
            width: 100% !important;
            height: auto !important;
          }
          .flex.flex-col.border-l {
            width: 100% !important;
            height: 50% !important;
          }
        }
      `}</style>
    </div>
  )
}
