import { useState } from 'react'
import { useStore, type Activity } from '@/store/useStore'
import { Clock, Users, HandHelping, Timer, Loader2 } from 'lucide-react'

interface ActivityCardProps {
  activity: Activity
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  const { currentUser, registerActivity, setConfirmModal, setLogHoursModal } = useStore()
  const [registering, setRegistering] = useState(false)

  const isRegistered = currentUser ? activity.registrations.includes(currentUser.id) : false
  const isClaimed = currentUser ? activity.claimedBy.includes(currentUser.id) : false
  const isEnded = activity.status === '已结束'
  const userHours = currentUser
    ? activity.hoursLogged.filter((h) => h.userId === currentUser.id).reduce((sum, h) => sum + h.hours, 0)
    : 0

  const handleRegister = async () => {
    if (!currentUser || isRegistered || registering || isEnded) return
    setRegistering(true)
    try {
      await registerActivity(activity.id)
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div
      className="relative flex flex-col rounded-xl p-6 transition-all duration-300 hover:-translate-y-1"
      style={{
        width: 320,
        minHeight: 360,
        background: '#1e1e2e',
        border: '1px solid transparent',
        boxShadow: '0 2px 8px #00000033',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#303f9f'
        e.currentTarget.style.boxShadow = '0 8px 20px #00000066'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'transparent'
        e.currentTarget.style.boxShadow = '0 2px 8px #00000033'
      }}
    >
      {activity.status === '进行中' && (
        <span
          className="absolute top-4 right-4 text-xs rounded px-2 py-0.5"
          style={{ background: '#4caf50', color: '#fff', borderRadius: 4, padding: '2px 8px' }}
        >
          进行中
        </span>
      )}
      {activity.status === '已结束' && (
        <span
          className="absolute top-4 right-4 text-xs rounded px-2 py-0.5"
          style={{ background: '#757575', color: '#fff', borderRadius: 4, padding: '2px 8px' }}
        >
          已结束
        </span>
      )}

      <h3 className="text-lg text-white mb-4 pr-16">{activity.title}</h3>

      <p className="text-sm text-[#b0bec5] line-clamp-3">{activity.description}</p>

      <div className="flex items-center gap-1 mt-3 text-xs text-[#78909c]">
        <Clock size={12} />
        <span>{activity.date}</span>
      </div>

      <div className="flex items-center gap-1 mt-2 text-sm text-[#b0bec5]">
        <Users size={14} />
        <span>已报名 {activity.registrations.length} 人</span>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-4 flex-wrap">
        <button
          onClick={handleRegister}
          disabled={isRegistered || registering || isEnded}
          className="h-10 rounded-full text-white text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
          style={{
            width: 120,
            background: isRegistered || isEnded ? '#757575' : '#1976d2',
            cursor: isRegistered || registering || isEnded ? 'not-allowed' : 'pointer',
            opacity: registering ? 0.7 : 1,
          }}
        >
          {registering && <Loader2 size={14} className="animate-spin" />}
          {isRegistered ? '已报名' : isEnded ? '已结束' : '立即报名'}
        </button>

        <button
          onClick={() => {
            if (!isClaimed && currentUser && !isEnded) {
              setConfirmModal({ show: true, activityId: activity.id, userId: currentUser.id })
            }
          }}
          disabled={isClaimed || isEnded}
          className="h-10 px-4 rounded-full text-sm transition-all duration-200"
          style={{
            background: isClaimed ? '#1b5e20' : isEnded ? '#2a2a3e' : '#2a2a3e',
            color: isClaimed ? '#fff' : isEnded ? '#757575' : '#b0b0b0',
            border: `1px solid ${isClaimed ? '#1b5e20' : isEnded ? '#4a4a5e' : '#4a4a5e'}`,
            cursor: isClaimed || isEnded ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => !isClaimed && !isEnded && (e.currentTarget.style.borderColor = '#64ffda')}
          onMouseLeave={(e) => !isClaimed && !isEnded && (e.currentTarget.style.borderColor = '#4a4a5e')}
        >
          <span className="flex items-center gap-1">
            <HandHelping size={14} />
            {isClaimed ? '任务已认领' : isEnded ? '已结束' : '认领任务'}
          </span>
        </button>

        <button
          onClick={() => {
            if (currentUser && !isEnded) {
              setLogHoursModal({ show: true, activityId: activity.id, userId: currentUser.id })
            }
          }}
          disabled={isEnded}
          className="h-10 px-4 rounded-full text-sm transition-all duration-200"
          style={{
            background: '#2a2a3e',
            color: isEnded ? '#757575' : '#ffb74d',
            border: '1px solid #4a4a5e',
            cursor: isEnded ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => !isEnded && (e.currentTarget.style.borderColor = '#ffb74d')}
          onMouseLeave={(e) => !isEnded && (e.currentTarget.style.borderColor = '#4a4a5e')}
        >
          <span className="flex items-center gap-1">
            <Timer size={14} />
            记录时长
          </span>
        </button>

        {userHours > 0 && (
          <span className="text-sm text-[#ffb74d] ml-1">
            已服务{userHours}小时
          </span>
        )}
      </div>
    </div>
  )
}
