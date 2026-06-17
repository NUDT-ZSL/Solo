import { useNavigate } from 'react-router-dom'
import type { Member } from '../types'

interface MembersPageProps {
  members: Member[]
  onSelectForScoring: (member: Member) => void
}

export default function MembersPage({ members, onSelectForScoring }: MembersPageProps) {
  const navigate = useNavigate()

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">团员管理</h1>
        <p className="page-subtitle">共 {members.length} 位团员</p>
      </div>
      <div className="members-grid">
        {members.map(member => (
          <div key={member.id} className="member-card ripple-parent">
            <div className="member-avatar">
              {member.name.charAt(0)}
            </div>
            <div className="member-info">
              <div className="member-name">{member.name}</div>
              <div className="member-voice">{member.voicePart}</div>
              <div className="member-date">加入：{member.joinDate}</div>
            </div>
            <div className="member-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onSelectForScoring(member)}
              >
                评分
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate(`/member/${member.id}`)}
              >
                详情
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
