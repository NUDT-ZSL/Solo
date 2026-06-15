import { useState, useEffect } from 'react'
import { Link2, Clock, X } from 'lucide-react'
import { EchoConnection } from '@/types'

interface ConnectionListProps {
  connections: EchoConnection[]
  userId: string
  onClose: () => void
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function ConnectionList({ connections, userId, onClose }: ConnectionListProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const getRemaining = (conn: EchoConnection): number => {
    if (conn.remaining_seconds !== undefined) return conn.remaining_seconds
    const expires = new Date(conn.expires_at).getTime()
    return Math.max(0, Math.floor((expires - now) / 1000))
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ocean-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-ocean-900/80 backdrop-blur-xl border-l border-ocean-400/20 shadow-[-8px_0_30px_rgba(0,0,0,0.3)] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-ocean-900/80 backdrop-blur-xl border-b border-ocean-400/10 p-4 flex items-center justify-between">
          <h3 className="font-display text-ocean-100 text-lg flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            回声连接
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-ocean-800/50 flex items-center justify-center hover:bg-ocean-700/50 transition-colors"
          >
            <X className="w-4 h-4 text-ocean-300" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {connections.length === 0 && (
            <div className="text-center py-12">
              <p className="text-ocean-400/50 font-body text-sm">还没有回声连接</p>
              <p className="text-ocean-400/30 font-body text-xs mt-1">回应一条漂流语音来建立连接</p>
            </div>
          )}

          {connections.map((conn) => {
            const remaining = getRemaining(conn)
            const isExpired = remaining <= 0 || conn.is_expired
            const isSender = conn.sender_id === userId

            return (
              <div
                key={conn.id}
                className={`
                  bg-ocean-800/30 backdrop-blur-sm border rounded-xl p-4 transition-all
                  ${isExpired
                    ? 'border-ocean-700/20 opacity-50'
                    : 'border-ocean-400/20'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-ocean-100 text-sm font-body truncate flex-1">
                    {conn.blur_title}
                  </p>
                  <span className={`
                    text-xs font-body ml-2 shrink-0 px-2 py-0.5 rounded-full
                    ${isExpired
                      ? 'bg-ocean-800/50 text-ocean-500'
                      : 'bg-ocean-400/10 text-ocean-300'
                    }
                  `}>
                    {isSender ? '发出' : '回应'}
                  </span>
                </div>

                {conn.response_text && (
                  <p className="text-ocean-200/70 text-xs font-body mb-2 line-clamp-2">
                    {conn.response_text}
                  </p>
                )}

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-ocean-400/60" />
                  <span className={`text-xs font-body ${isExpired ? 'text-ocean-500' : 'text-ocean-300/70'}`}>
                    {isExpired ? '已消散' : `${formatTime(remaining)} 后消散`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
