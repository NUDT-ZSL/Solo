// 个人主页组件
import React, { useState, useEffect } from 'react';
import UserCard from '../components/UserCard';
import CheckInModal from '../components/CheckInModal';
import ActivityList from '../components/ActivityList';
import BadgeGallery from '../components/BadgeGallery';
import Notification from '../components/Notification';
import FlipNumber from '../components/FlipNumber';

// 用户数据类型定义
interface User {
  id: string;
  name: string;
  avatar: string;
  totalHours: number;
  badges: Badge[];
}

// 徽章类型定义
interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  level: number;
}

// 活动记录类型定义
interface Activity {
  id: string;
  date: string;
  hours: number;
  description: string;
}

// HomePage主组件
const HomePage: React.FC = () => {
  // 用户数据状态
  const [user, setUser] = useState<User | null>(null);
  // 打卡弹窗显示状态
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  // 新加载徽章状态
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  // 加载状态
  const [loading, setLoading] = useState(true);
  // 活动记录状态
  const [activities, setActivities] = useState<Activity[]>([]);

  // 从URL获取userId并加载用户数据
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId') || 'default-user';
    
    // 模拟加载用户数据
    const loadUserData = async () => {
      setLoading(true);
      try {
        // 模拟API请求延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 模拟用户数据
        const mockUser: User = {
          id: userId,
          name: '张志愿',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + userId,
          totalHours: 156,
          badges: [
            { id: '1', name: '初心者', icon: '🌱', description: '完成首次志愿服务', level: 1 },
            { id: '2', name: '热心肠', icon: '💝', description: '累计服务10小时', level: 2 },
            { id: '3', name: '奉献者', icon: '🏅', description: '累计服务50小时', level: 3 },
          ]
        };

        // 模拟活动记录数据
        const mockActivities: Activity[] = Array.from({ length: 50 }, (_, i) => ({
          id: `act-${i + 1}`,
          date: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
          hours: Math.floor(Math.random() * 8) + 1,
          description: ['社区环保活动', '敬老院探访', '图书馆义工', '交通引导', '慈善募捐'][i % 5],
        }));

        setUser(mockUser);
        setActivities(mockActivities);
      } catch (error) {
        console.error('加载用户数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // 处理打卡按钮点击
  const handleCheckInClick = () => {
    setShowCheckInModal(true);
  };

  // 处理打卡成功
  const handleCheckInSuccess = (hours: number) => {
    setShowCheckInModal(false);
    
    if (user) {
      // 更新用户总工时
      const newTotalHours = user.totalHours + hours;
      setUser({ ...user, totalHours: newTotalHours });

      // 模拟获取新徽章（根据工时判断）
      const earnedBadges: Badge[] = [];
      
      // 示例：100小时获得新徽章
      if (newTotalHours >= 100 && !user.badges.find(b => b.id === '4')) {
        earnedBadges.push({
          id: '4',
          name: '百小时达人',
          icon: '🏆',
          description: '累计服务100小时',
          level: 4
        });
      }

      // 示例：200小时获得新徽章
      if (newTotalHours >= 200 && !user.badges.find(b => b.id === '5')) {
        earnedBadges.push({
          id: '5',
          name: '卓越志愿者',
          icon: '👑',
          description: '累计服务200小时',
          level: 5
        });
      }

      // 如果有新徽章，更新用户并显示通知
      if (earnedBadges.length > 0) {
        setUser(prev => prev ? { ...prev, badges: [...prev.badges, ...earnedBadges] } : prev);
        setNewBadges(earnedBadges);

        // 5秒后自动隐藏通知
        setTimeout(() => {
          setNewBadges([]);
        }, 5000);
      }

      // 添加新的活动记录
      const newActivity: Activity = {
        id: `act-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        hours: hours,
        description: '志愿服务打卡',
      };
      setActivities(prev => [newActivity, ...prev]);
    }
  };

  // 关闭通知
  const handleCloseNotification = () => {
    setNewBadges([]);
  };

  // 加载中显示
  if (loading) {
    return (
      <div style={{
        maxWidth: '1024px',
        margin: '0 auto',
        padding: '20px',
        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFF0E0 100%)',
        minHeight: '100vh',
      }}>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <div style={{ display: 'inline-flex', gap: '8px' }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#E8A87C',
                  animation: `dot-bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
                }}
              />
            ))}
          </div>
          <p style={{ marginTop: '16px', color: '#888' }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1024px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg, #FFF7ED 0%, #FFF0E0 100%)',
      minHeight: '100vh',
    }}>
      {/* 顶部导航栏 */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 0',
        marginBottom: '24px',
        borderBottom: '1px solid rgba(232, 168, 124, 0.3)',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#D2691E',
          margin: 0,
        }}>
          🌟 志愿者服务系统
        </h1>
        <a
          href="/leaderboard"
          style={{
            padding: '8px 20px',
            background: 'transparent',
            border: '2px solid #E8A87C',
            borderRadius: '20px',
            color: '#D2691E',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'all 0.3s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#E8A87C';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#D2691E';
          }}
        >
          🏆 排行榜
        </a>
      </nav>

      {/* UserCard组件 */}
      {user && <UserCard user={user} />}

      {/* 打卡按钮 */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
        <button
          onClick={handleCheckInClick}
          style={{
            padding: '16px 48px',
            fontSize: '18px',
            fontWeight: 600,
            color: 'white',
            background: 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #FF7B31 0%, #FF5A24 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
        >
          ✅ 立即打卡
        </button>
      </div>

      {/* 累计工时显示（使用FlipNumber动画） */}
      {user && (
        <div style={{
          textAlign: 'center',
          marginBottom: '32px',
          padding: '24px',
          background: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '16px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        }}>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>累计服务工时</p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '8px' }}>
            <FlipNumber value={user.totalHours} />
            <span style={{ fontSize: '24px', fontWeight: 500, color: '#D2691E' }}>小时</span>
          </div>
        </div>
      )}

      {/* BadgeGallery徽章画廊 */}
      {user && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#D2691E',
            marginBottom: '16px',
            paddingLeft: '12px',
            borderLeft: '4px solid #FF8C42',
          }}>
            我的徽章
          </h2>
          <BadgeGallery badges={user.badges} />
        </div>
      )}

      {/* ActivityList虚拟列表 */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#D2691E',
          marginBottom: '16px',
          paddingLeft: '12px',
          borderLeft: '4px solid #FF8C42',
        }}>
          活动记录
        </h2>
        <ActivityList activities={activities} />
      </div>

      {/* CheckInModal弹窗 */}
      {showCheckInModal && (
        <CheckInModal
          onClose={() => setShowCheckInModal(false)}
          onSuccess={handleCheckInSuccess}
        />
      )}

      {/* Notification组件（收到newBadges时显示） */}
      {newBadges.length > 0 && (
        <Notification
          badges={newBadges}
          onClose={handleCloseNotification}
        />
      )}
    </div>
  );
};

export default HomePage;
