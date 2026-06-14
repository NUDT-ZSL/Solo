import { Pledge, CATEGORY_COLORS, CATEGORY_LABELS, getCurrentUserId } from './dataStore'

interface PledgeCardProps {
  pledge: Pledge
  onClick: () => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${date.getFullYear()}年${month}月${day}日`
}

export default function PledgeCard({ pledge, onClick }: PledgeCardProps) {
  const currentUserId = getCurrentUserId()
  const isOwn = pledge.userId === currentUserId
  const initial = pledge.userName.charAt(0)

  return (
    <div className="pledge-card" onClick={onClick}>
      <div className="card-header">
        <span
          className="category-tag"
          style={{ background: CATEGORY_COLORS[pledge.category] }}
        >
          {CATEGORY_LABELS[pledge.category]}
        </span>
        <span className="card-date">{formatDate(pledge.departureDate)}</span>
      </div>

      <div className="card-destination">
        📍 {pledge.destination}
      </div>

      <div className="card-user">
        <span className="user-avatar">{initial}</span>
        <span>
          {pledge.userName}
          {isOwn && <span className="own-card-badge">我的</span>}
        </span>
      </div>

      <div className="card-description">
        {pledge.description}
      </div>

      <div className="progress-container">
        <div className="progress-label">
          <span>完成进度</span>
          <span style={{ fontWeight: 600, color: '#22c55e' }}>{pledge.progress}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${pledge.progress}%` }}
          />
        </div>
      </div>

      {pledge.milestones.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
          已完成 {pledge.milestones.length} 条记录
        </div>
      )}
    </div>
  )
}
