import Timeline from './Timeline'
import FilterPanel from './FilterPanel'
import BranchPanel from './BranchPanel'
import { useTimelineStore } from './store'

export default function App() {
  const selectedEvent = useTimelineStore((s) => s.selectedEvent)

  return (
    <div className="w-screen h-screen flex overflow-hidden" style={{ background: '#0a0e27' }}>
      <FilterPanel />
      <div className="flex-1 relative">
        <Timeline />
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <h1
            className="text-lg font-mono font-bold tracking-[0.3em] text-center"
            style={{
              color: 'rgba(255, 215, 0, 0.7)',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
            }}
          >
            时 光 旅 者
          </h1>
          <p
            className="text-center text-xs font-mono mt-1"
            style={{ color: 'rgba(200, 200, 220, 0.35)' }}
          >
            CHRONONAUT · 拖拽探索 · 悬停查看 · 点击深入
          </p>
        </div>
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <p
            className="text-xs font-mono text-center"
            style={{ color: 'rgba(200, 200, 220, 0.25)' }}
          >
            ← 拖拽浏览时间轴 →
          </p>
        </div>
      </div>
      {selectedEvent && <BranchPanel />}
    </div>
  )
}
