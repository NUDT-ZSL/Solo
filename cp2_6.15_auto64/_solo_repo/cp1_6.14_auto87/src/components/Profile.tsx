import { useState, useEffect, useCallback } from 'react';
import http from '../services/http';
import { FitnessClass, CompletedClass } from '../types';

interface ProfileProps {
  userId: string;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onBookingChange: () => void;
}

interface ProfileData {
  id: string;
  name: string;
  role: 'member' | 'coach';
  bookings: string[];
  bookedClasses: FitnessClass[];
  completedClasses: CompletedClass[];
}

function Profile({ userId, onToast, onBookingChange }: ProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'history'>('bookings');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await http.get<any, ProfileData>(`/profile?userId=${userId}`);
      setProfile(data);
    } catch (error: any) {
      onToast(error.response?.data?.message || '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, onToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleCancel = async (classId: string) => {
    if (cancelingId) return;

    setCancelingId(classId);
    try {
      await http.post(`/classes/${classId}/cancel`, { userId });
      onToast('取消成功', 'success');
      fetchProfile();
      onBookingChange();
    } catch (error: any) {
      onToast(error.response?.data?.message || '取消失败', 'error');
    } finally {
      setCancelingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  };

  const totalCalories = profile?.completedClasses.reduce((sum, c) => sum + c.calories, 0) || 0;
  const totalClasses = profile?.completedClasses.length || 0;
  const upcomingCount = profile?.bookedClasses.length || 0;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="avatar-section">
          <div className="avatar">
            <span className="avatar-icon">👤</span>
          </div>
          <div className="user-info">
            <h1 className="user-name">{profile?.name || '加载中...'}</h1>
            <p className="user-role">
              {profile?.role === 'coach' ? '👨‍🏫 教练' : '🏃 会员'}
            </p>
          </div>
        </div>
        
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{upcomingCount}</span>
            <span className="stat-label">预约课程</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{totalClasses}</span>
            <span className="stat-label">完成课程</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{totalCalories}</span>
            <span className="stat-label">消耗卡路里</span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <span className="tab-icon">📅</span>
          我的预约
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="tab-icon">📊</span>
          训练记录
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'bookings' && (
          <div className="bookings-section">
            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>加载中...</p>
              </div>
            ) : profile?.bookedClasses.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>暂无预约课程</p>
                <p className="empty-hint">去课表页预约你喜欢的课程吧</p>
              </div>
            ) : (
              <div className="bookings-list">
                {profile?.bookedClasses.map(fitnessClass => (
                  <div key={fitnessClass.id} className="booking-card">
                    <div className="booking-info">
                      <span className="booking-type">{fitnessClass.type}</span>
                      <h3 className="booking-name">{fitnessClass.name}</h3>
                      <div className="booking-details">
                        <span>📅 {formatDate(fitnessClass.date)}</span>
                        <span>⏰ {fitnessClass.time}</span>
                        <span>👨‍🏫 {fitnessClass.coach}</span>
                        <span>⏱️ {fitnessClass.duration}分钟</span>
                      </div>
                    </div>
                    <button
                      className="cancel-btn"
                      onClick={() => handleCancel(fitnessClass.id)}
                      disabled={cancelingId === fitnessClass.id}
                    >
                      {cancelingId === fitnessClass.id ? '取消中...' : '取消预约'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>加载中...</p>
              </div>
            ) : profile?.completedClasses.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📊</span>
                <p>暂无训练记录</p>
                <p className="empty-hint">完成课程后会自动记录在这里</p>
              </div>
            ) : (
              <div className="history-list">
                {profile?.completedClasses.map(record => (
                  <div key={record.classId} className="history-card">
                    <div className="history-icon">
                      <span>💪</span>
                    </div>
                    <div className="history-content">
                      <h4 className="history-name">{record.className}</h4>
                      <div className="history-meta">
                        <span>👨‍🏫 {record.coach}</span>
                        <span>📅 {formatDate(record.date)}</span>
                      </div>
                    </div>
                    <div className="history-calories">
                      <span className="calories-value">{record.calories}</span>
                      <span className="calories-label">卡路里</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .profile-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .profile-header {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 32px;
          background: rgba(30, 30, 46, 0.6);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .avatar-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4caf50, #81c784);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
        }

        .avatar-icon {
          font-size: 36px;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .user-name {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .user-role {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #4caf50, #81c784);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
        }

        .tabs {
          display: flex;
          gap: 8px;
          padding: 6px;
          background: rgba(30, 30, 46, 0.6);
          backdrop-filter: blur(10px);
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 20px;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.25s ease-out;
        }

        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .tab-btn.active {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
          box-shadow: 0 2px 12px rgba(76, 175, 80, 0.2);
        }

        .tab-icon {
          font-size: 16px;
        }

        .tab-content {
          min-height: 300px;
        }

        .bookings-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .booking-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px;
          background: #1e1e2e;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.25s ease-out;
        }

        .booking-card:hover {
          transform: translateX(4px);
          border-color: rgba(76, 175, 80, 0.3);
        }

        .booking-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .booking-type {
          display: inline-block;
          padding: 4px 12px;
          background: rgba(76, 175, 80, 0.15);
          color: #4caf50;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          width: fit-content;
        }

        .booking-name {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .booking-details {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
        }

        .cancel-btn {
          position: relative;
          padding: 12px 24px;
          background: transparent;
          color: #f44336;
          border: 1px solid rgba(244, 67, 54, 0.5);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.25s ease-out;
          white-space: nowrap;
          overflow: hidden;
        }

        .cancel-btn::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(244, 67, 54, 0.2);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.4s, height 0.4s;
        }

        .cancel-btn:active::after {
          width: 200px;
          height: 200px;
        }

        .cancel-btn:hover:not(:disabled) {
          background: rgba(244, 67, 54, 0.1);
          border-color: #f44336;
        }

        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.25s ease-out;
        }

        .history-card:hover {
          transform: translateX(4px);
          background: rgba(255, 255, 255, 0.2);
        }

        .history-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255, 152, 0, 0.3), rgba(255, 87, 34, 0.3));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .history-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .history-name {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .history-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }

        .history-calories {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .calories-value {
          font-size: 22px;
          font-weight: 700;
          background: linear-gradient(135deg, #ff9800, #ff5722);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .calories-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          gap: 16px;
          color: rgba(255, 255, 255, 0.6);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #4caf50;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          gap: 12px;
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
        }

        .empty-icon {
          font-size: 48px;
        }

        .empty-hint {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
        }

        @media (max-width: 768px) {
          .profile-header {
            padding: 20px;
          }

          .stats-row {
            grid-template-columns: 1fr;
          }

          .booking-card {
            flex-direction: column;
            align-items: stretch;
          }

          .booking-details {
            gap: 8px 16px;
          }

          .history-card {
            flex-wrap: wrap;
          }

          .history-calories {
            width: 100%;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            padding-top: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
        }
      `}</style>
    </div>
  );
}

export default Profile;
