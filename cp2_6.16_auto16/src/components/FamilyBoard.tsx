import React from 'react';
import { useAppContext } from '../App';
import type { Member } from '../api/taskApi';

const RANK_BADGES: Record<number, { emoji: string; className: string }> = {
  1: { emoji: '🥇', className: 'rank-1' },
  2: { emoji: '🥈', className: 'rank-2' },
  3: { emoji: '🥉', className: 'rank-3' },
};

interface MemberCardProps {
  member: Member;
  rank: number;
  selected: boolean;
  animated: boolean;
  onClick: () => void;
  claimedTaskCount: number;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, rank, selected, animated, onClick, claimedTaskCount }) => {
  const badge = RANK_BADGES[rank];

  return (
    <div
      className={`member-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {badge && (
        <div className={`rank-badge ${badge.className}`}>
          <img
            src={`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text x="12" y="18" text-anchor="middle" font-size="16">${badge.emoji}</text></svg>`)}`}
            alt={`第${rank}名`}
            width="24"
            height="24"
            style={{ display: 'block' }}
          />
        </div>
      )}
      <div className="member-avatar">{member.avatar}</div>
      <div className="member-name">{member.name}</div>
      <div className={`member-points ${animated ? 'animate' : ''}`}>
        🏆 {member.points}
      </div>
      {claimedTaskCount > 0 && (
        <div className="member-claimed-count">📋 {claimedTaskCount}个任务</div>
      )}
    </div>
  );
};

const FamilyBoard: React.FC = () => {
  const {
    familyName,
    members,
    tasks,
    currentMemberId,
    setCurrentMemberId,
    animatedMemberId,
  } = useAppContext();

  const sortedMembers = [...members].sort((a, b) => b.points - a.points);
  const currentMember = members.find(m => m.id === currentMemberId);

  const getClaimedTaskCount = (memberId: string): number => {
    return tasks.filter(t => t.claimed_by === memberId && !t.completed).length;
  };

  const currentClaimedTasks = tasks.filter(
    t => t.claimed_by === currentMemberId && !t.completed
  );

  return (
    <>
      <div className="family-header">
        <h1 className="family-name">🏠 {familyName}</h1>
        {currentMember && (
          <div className="current-member-info">
            <div className="current-member-avatar">{currentMember.avatar}</div>
            <span style={{ fontWeight: 500 }}>{currentMember.name}</span>
            <span style={{ color: '#f57c00', fontWeight: 600 }}>
              🏆 {currentMember.points}
            </span>
          </div>
        )}
      </div>

      <div className="members-section">
        <h2 className="section-title">🏆 成员排行榜</h2>
        {sortedMembers.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">👨‍👩‍👧‍👦</div>
            <div className="empty-state-text">暂无成员数据</div>
          </div>
        ) : (
          <div className="members-grid">
            {sortedMembers.map((member, index) => (
              <MemberCard
                key={member.id}
                member={member}
                rank={index + 1}
                selected={member.id === currentMemberId}
                animated={member.id === animatedMemberId}
                onClick={() => setCurrentMemberId(member.id)}
                claimedTaskCount={getClaimedTaskCount(member.id)}
              />
            ))}
          </div>
        )}
      </div>

      {currentMember && currentClaimedTasks.length > 0 && (
        <div className="claimed-tasks-section">
          <h3 className="section-title">
            📋 {currentMember.name} 的已认领任务
          </h3>
          <div className="claimed-tasks-list">
            {currentClaimedTasks.map(task => (
              <div key={task.id} className={`claimed-task-item ${task.difficulty}`}>
                <span className="claimed-task-title">{task.title}</span>
                <span className="claimed-task-points">+{task.points}分</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default FamilyBoard;
