import { useEffect, useState, useCallback } from 'react'
import { Clock, Radio } from 'lucide-react'
import { useRadioStore, Connection } from './store'

const TYPE_ICONS: Record<string, string> = {
  lyrics: '🎵',
  dream: '💭',
  sound: '🔊',
  other: '❓',
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':')
}

function ConnectionCard({ connection }: { connection: Connection }) {
  const [remaining, setRemaining] = useState(() =>
    new Date(connection.expires_at).getTime() - Date.now()
  )

  const isActive = remaining > 0

  useEffect(() => {
    if (!isActive) return
    const timer = setInterval(() => {
      setRemaining(new Date(connection.expires_at).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [connection.expires_at, isActive])

  const typeIcon = TYPE_ICONS[connection.status] || TYPE_ICONS.other

  if (!isActive) {
    return (
      <div className="card-radio p-4 opacity-40 transition-all duration-1000 scale-95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{typeIcon}</span>
            <span className="font-retro text-cream/50 text-sm">已结束</span>
          </div>
          <span className="font-retro text-cream/30 text-xs">
            {new Date(connection.created_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="card-radio p-4 border border-copper/50 animate-glow transition-all duration-300"
      style={{
        boxShadow: '0 0 12px rgba(205,127,50,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcon}</span>
          <span className="font-retro text-dark-gold text-sm">心灵共振</span>
        </div>
        <span className="font-retro text-cream/40 text-xs">
          {new Date(connection.created_at).toLocaleDateString('zh-CN')}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-copper" />
        <span className="font-retro text-copper text-sm tracking-wider">
          {formatCountdown(remaining)}
        </span>
      </div>
    </div>
  )
}

export default function ConnectionList() {
  const { connections, fetchConnections } = useRadioStore()

  useEffect(() => {
    fetchConnections()
    const interval = setInterval(fetchConnections, 30000)
    return () => clearInterval(interval)
  }, [fetchConnections])

  const activeConnections = connections.filter(
    (c) => new Date(c.expires_at).getTime() > Date.now()
  )
  const expiredConnections = connections.filter(
    (c) => new Date(c.expires_at).getTime() <= Date.now()
  )

  if (connections.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Radio className="w-16 h-16 text-copper/20 mx-auto mb-4" />
        <p className="font-retro text-cream/40 text-lg">暂无心灵共振</p>
        <p className="font-retro text-cream/20 text-sm mt-2">去猜谜，寻找与你同频的灵魂</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h2 className="font-display text-cream text-xl mb-4 text-center">心灵共振</h2>

      {activeConnections.length > 0 && (
        <div className="mb-6">
          <p className="font-retro text-dark-gold text-sm mb-2">进行中</p>
          <div className="space-y-3">
            {activeConnections.map((c) => (
              <ConnectionCard key={c.id} connection={c} />
            ))}
          </div>
        </div>
      )}

      {expiredConnections.length > 0 && (
        <div>
          <p className="font-retro text-cream/30 text-sm mb-2">已结束</p>
          <div className="space-y-2">
            {expiredConnections.map((c) => (
              <ConnectionCard key={c.id} connection={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
