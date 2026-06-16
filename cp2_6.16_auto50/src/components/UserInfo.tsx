import { useStore } from '@/store/useStore'
import { Loader2 } from 'lucide-react'

export default function UserInfo() {
  const { currentUser, users, setCurrentUser, loading } = useStore()

  const handleUserChange = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (user) {
      await setCurrentUser(user)
    }
  }

  const roleColor =
    currentUser?.role === '管理员'
      ? '#64ffda'
      : currentUser?.role === '志愿者'
        ? '#ffb74d'
        : '#90caf9'

  if (!currentUser) {
    return (
      <div className="flex items-center gap-2 text-white text-sm">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-[#b0bec5]">加载中...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 text-white text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">{currentUser.name}</span>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ background: roleColor + '33', color: roleColor, border: `1px solid ${roleColor}55` }}
        >
          {currentUser.role}
        </span>
      </div>
      <div className="hidden md:flex items-center gap-3 text-[#b0bec5]">
        <span>已报名 <b className="text-white">{currentUser.registeredActivities.length}</b></span>
        <span>认领 <b className="text-white">{currentUser.claimedTasks.length}</b></span>
        <span>服务 <b className="text-white">{currentUser.totalHours}h</b></span>
      </div>
      <select
        value={currentUser.id}
        onChange={(e) => handleUserChange(e.target.value)}
        className="h-8 rounded px-2 text-sm outline-none cursor-pointer"
        style={{
          background: '#2a2a3e',
          color: '#fff',
          border: '1px solid #4a4a5e',
        }}
        disabled={loading}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role})
          </option>
        ))}
      </select>
    </div>
  )
}
