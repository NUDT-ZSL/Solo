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
              <path d="M18 9h1.5a2.5 2.5 0 0 0