import React from 'react';
import { useTeam } from '../hooks/useTeam';
import type { TeamMember } from '../utils/types';
import Avatar from '../components/Avatar';
import MemberCard from '../components/MemberCard';

const MEDAL_COLORS = ['#fbbf24', '#cbd5e1', '#d97706'];

const Dashboard: React.FC = () => {
  const { team, loading, error, handleLike } = useTeam();

  const totalLikes = team.reduce((sum, m) => sum + m.likes, 0);

  const sortedByContribution = [...team].sort(
    (a, b) => b.prCount + b.issueCount - (a.prCount + a.issueCount)
  );

  const topThree = sortedByContribution.slice(0, 3);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.loading, color: '#ef4444' }}>
          加载失败：{error}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.statsBar}>
        <div style={styles.totalLikesCard}>
          <div style={styles.likesIcon}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="#ef4444"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div>
            <div style={styles.likesLabel}>团队总点赞</div>
            <div style={styles.likesValue}>{totalLikes}</div>
          </div>
        </div>

        <div style={styles.leaderboard}>
          <div style={styles.leaderboardTitle}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: 6 }}
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            月度贡献排行榜
          </div>
          <div style={styles.leaderboardContent}>
            {topThree.map((member, index) => (
              <div key={member.id} style={styles.rankItem}>
                <div style={styles.rankAvatarWrapper}>
                  <div
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: MEDAL_COLORS[index],
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                      zIndex: 2,
                    }}
                  >
                    {index + 1}
                  </div>
                  <Avatar
                    initial={member.avatarInitial}
                    color={member.avatarColor}
                    size={48}
                    medalColor={MEDAL_COLORS[index]}
                    scale={1.3}
                  />
                </div>
                <div style={styles.rankInfo}>
                  <div style={styles.rankName}>{member.name}</div>
                  <div style={styles.rankScore}>
                    {member.prCount + member.issueCount} 贡献
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>团队成员</h2>
        <span style={styles.sectionSubtitle}>
          共 {team.length} 位成员
        </span>
      </div>

      <div style={styles.cardGrid}>
        {team.map((member) => (
          <MemberCard key={member.id} member={member} onLike={handleLike} />
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '24px',
  },
  loading: {
    textAlign: 'center',
    padding: 80,
    fontSize: 16,
    color: '#64748b',
  },
  statsBar: {
    display: 'flex',
    gap: 24,
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  totalLikesCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  likesIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likesLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  likesValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1e293b',
    lineHeight: 1.2,
  },
  leaderboard: {
    flex: 2,
    minWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
  },
  leaderboardContent: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  rankItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  rankAvatarWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  rankInfo: {
    textAlign: 'center',
  },
  rankName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: 2,
  },
  rankScore: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: 500,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  cardGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 20,
  },
};

export default Dashboard;
