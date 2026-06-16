import { useStore } from '@/store/useStore'

export default function UserInfo() {
  const { currentUser, users, setCurrentUser } = useStore()

  if (!currentUser) return null

  const roleColor =
    currentUser.role === '管理员'
      ? '#64ffda'
      : currentUser.role === '志愿者'
        ? '#ffb74d'
        : '#90caf9'

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
      <div className="flex items-center gap-3 text-[#b0bec5]">
        <span>已报名 <b className="text-white">{currentUser.registeredActivities.length}</b></span>
        <span>认领 <b className="text-white">{currentUser.claimedTasks.length}</b></span>
        <span>服务 <b className="text-white">{currentUser.totalHours}h</b></span>
      </div>
      <select
        value={currentUser.id}
        onChange={(e) => {
          const user = users.find((u) => u.id === e.target.value)
          if (user) setCurrentUser(user)
        }}
        className="h-8 rounded px-2 text-sm outline-none cursor-pointer"
        style={{
          background: '#2a2a3e',
          color: '#fff',
          border: '1px solid #4a4a5e',
        }}
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
