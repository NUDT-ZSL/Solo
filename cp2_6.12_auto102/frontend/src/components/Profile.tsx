import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import './Profile.css';

interface UserStats {
  total_reading_hours: number;
  total_sessions: number;
  week_reading_hours: number;
  categories: { category: string; count: number }[];
  borrow_stats: {
    total_borrowed: number;
    overdue_count: number;
    current_borrowed: number;
  };
}

const AVATAR_COLORS = [
  '#8B4513', '#D2691E', '#A0522D', '#CD853F', '#DEB887',
  '#BC8F8F', '#F4A460', '#DAA520', '#B8860B', '#6B8E23'
];

const Profile: React.FC = () => {
  const { user } = useAppContext();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const res = await axios.get(`/api/stats/summary/user/${user!.id}`);
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error('获取用户统计失败', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const avatarColor = user ? getAvatarColor(user.name) : '#8B4513';

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1 className="page-title">个人中心</h1>
        <p className="page-subtitle">管理您的个人信息和查看阅读统计</p>
      </div>

      <div className="profile-content">
        <motion.div
          className="profile-card card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="profile-avatar-section">
            <div
              className="profile-avatar"
              style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)` }}
            >
              {user?.name.charAt(0)}
            </div>
            <div className="profile-name-section">
              <h2 className="profile-name">{user?.name}</h2>
              <p className="profile-email">{user?.email}</p>
              <span className="profile-role-badge">
                {user?.role === 'admin' ? '管理员' : '读者'}
              </span>
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-stats-section">
            <h3 className="section-title">借阅统计</h3>
            <div className="profile-stats-grid">
              <div className="profile-stat-item">
                <div className="profile-stat-value">
                  {stats?.borrow_stats?.total_borrowed || 0}
                </div>
                <div className="profile-stat-label">总借书数</div>
              </div>
              <div className="profile-stat-item">
                <div className="profile-stat-value danger">
                  {stats?.borrow_stats?.overdue_count || 0}
                </div>
                <div className="profile-stat-label">逾期次数</div>
              </div>
              <div className="profile-stat-item">
                <div className="profile-stat-value highlight">
                  {stats?.borrow_stats?.current_borrowed || 0}
                </div>
                <div className="profile-stat-label">在借图书数</div>
              </div>
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-reading-section">
            <h3 className="section-title">阅读数据</h3>
            <div className="profile-stats-grid">
              <div className="profile-stat-item">
                <div className="profile-stat-value">
                  {stats?.total_reading_hours.toFixed(1) || '0.0'}
                </div>
                <div className="profile-stat-label">总阅读时长（小时）</div>
              </div>
              <div className="profile-stat-item">
                <div className="profile-stat-value">
                  {stats?.total_sessions || 0}
                </div>
                <div className="profile-stat-label">阅读次数</div>
              </div>
              <div className="profile-stat-item">
                <div className="profile-stat-value highlight">
                  {stats?.week_reading_hours.toFixed(1) || '0.0'}
                </div>
                <div className="profile-stat-label">本周阅读（小时）</div>
              </div>
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-preferences-section">
            <h3 className="section-title">阅读偏好</h3>
            {stats?.categories && stats.categories.length > 0 ? (
              <div className="preference-tags">
                {stats.categories.map((cat, index) => (
                  <span
                    key={cat.category}
                    className="preference-tag"
                    style={{
                      background: getTagColor(index),
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    {cat.category}
                    <span className="tag-count">{cat.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="no-preferences">暂无阅读偏好数据，开始借阅后将自动生成</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const getTagColor = (index: number) => {
  const colors = [
    '#F5E6D3', '#E8D5B7', '#D4C4A8', '#C9B896', '#BEAD84'
  ];
  return colors[index % colors.length];
};

export default Profile;
