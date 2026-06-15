import { Users, Activity } from 'lucide-react'
import { useCanvasStore } from '@/hooks/useCanvasStore'

export default function StatusBar() {
  const onlineCount = useCanvasStore((s) => s.onlineCount)
  const activities = useCanvasStore((s) => s.activities)
  const likeCount = useCanvasStore((s) => s.likeCount)
  const connected = useCanvasStore((s) => s.connected)

  return (
    <div className="glass-panel p-4 w-72 animate-slide-in-right flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-ocean-300" />
        <span className="font-body text-sm text-white/90">
          在线 <span className="font-bold text-white">{onlineCount}</span> 人
        </span>
        <span className={`ml-auto w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>

      <div className="flex items-center gap-2">
        <Activity size={16} className="text-dream-300" />
        <span className="font-body text-sm text-white/90">
          亮度 <span className="font-bold text-white">{likeCount}</span> 赞
        </span>
      </div>

      <div className="border-t border-white/15 pt-2">
        <h3 className="text-xs font-body text-white/60 font-semibold tracking-wide uppercase mb-2">
          最近动态
        </h3>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-xs font-body text-white/40 italic">暂无动态，开始创作吧...</p>
          ) : (
            activities.map((act, i) => (
              <div
                key={`${act.timestamp}-${i}`}
                className="text-xs font-body text-white/70 flex items-start gap-1.5 animate-fade-in"
              >
                <span className="text-coral-400 mt-0.5">◆</span>
                <span>{act.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
