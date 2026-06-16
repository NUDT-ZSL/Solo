import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Award, TrendingUp, Droplets, BookOpen, ClipboardList } from 'lucide-react'
import { useGardenStore } from '@/store/gardenStore'
import { getUserLevel } from '@/utils/gardenLogic'

export default function Profile() {
  const user = useGardenStore((s) => s.user)
  const navigate = useNavigate()

  if (!user) {
    navigate('/login')
    return null
  }

  const { level, progress, color, gradient, progressGradient } = getUserLevel(user.points)
  const pointsToNext = 100 - (user.points % 100)

  const stats = [
    { label: '浇水次数', value: Math.floor(user.points / 10), icon: Droplets, color: '#42A5F5' },
    { label: '日志记录', value: Math.floor(user.points / 20), icon: BookOpen, color: '#FFA726' },
    { label: '完成任务', value: Math.floor(user.points / 50), icon: ClipboardList, color: '#AB47BC' },
  ]

  return (
    <div className="min-h-screen bg-garden-bg" style={{ paddingTop: 80 }}>
      <div className="max-w-2xl mx-auto px-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-garden-text hover:text-garden-title transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回</span>
        </button>

        <div
          className="bg-garden-card rounded-[12px] p-8 flex flex-col items-center gap-4"
          style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.08)' }}
        >
          <span className="text-6xl">{user.avatar}</span>

          <h2 className="text-2xl font-bold" style={{ color: '#33691E' }}>
            {user.username}
          </h2>

          <span
            className="px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: user.role === 'manager' ? '#2E7D32' : '#66BB6A' }}
          >
            {user.role === 'manager' ? '管理者' : '成员'}
          </span>

          <div className="flex items-center gap-2 mt-2">
            <Award className="w-8 h-8" style={{ color }} />
            <span className="text-4xl font-bold" style={{ color }}>
              Lv.{level}
            </span>
          </div>

          <p className="text-garden-text text-lg">
            {user.points} 积分
          </p>

          <p className="text-garden-text text-sm">
            距下一级还需 {pointsToNext} 积分
          </p>

          <div className="w-full mt-2">
            <div
              className="w-full rounded-full overflow-hidden relative"
              style={{ height: 20, backgroundColor: '#E8F5E9' }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 pointer-events-none"
                style={{ width: '100%', background: gradient, opacity: 0.25 }}
              />
              <div
                className="h-full rounded-full transition-all duration-700 relative"
                style={{
                  width: `${progress * 100}%`,
                  background: progressGradient,
                  boxShadow: `0 0 8px ${color}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <div className="flex items-center gap-1 text-xs text-garden-text">
                <span style={{ color: '#8BC34A' }}>●</span> Lv.{level}
              </div>
              <div className="flex items-center gap-1 text-xs text-garden-text">
                <span style={{ color: '#388E3C' }}>●</span> Lv.{level + 1}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-garden-card rounded-[12px] p-4 flex flex-col items-center gap-2"
              style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.08)' }}
            >
              <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              <span className="text-2xl font-bold text-garden-title">{stat.value}</span>
              <span className="text-xs text-garden-text">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
