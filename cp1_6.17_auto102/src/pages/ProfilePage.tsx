import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trophy, TrendingUp, LogIn, AlertCircle } from 'lucide-react';
import BarChart from '../components/BarChart';
import ReviewList from '../components/ReviewList';
import { api } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import type { ActivityWordPoint, UserRank, Review, Activity } from '../../shared/types';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useUserStore();
  const [activityData, setActivityData] = useState<ActivityWordPoint[]>([]);
  const [rank, setRank] = useState<UserRank | null>(null);
  const [userReviews, setUserReviews] = useState<(Review & { user: any; activity?: Activity })[]>([]);
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [showLogin, setShowLogin] = useState(!currentUser);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [act, rk, revs] = await Promise.all([
        api.get<ActivityWordPoint[]>(`/stats/user-activity/${currentUser.id}?days=7`),
        api.get<UserRank>(`/stats/user-rank/${currentUser.id}`),
        api.get<Review[]>(`/reviews?userId=${currentUser.id}`),
      ]);
      setActivityData(act);
      setRank(rk);
      const activityMap: Record<string, Activity> = {};
      try {
        const actsRes = await api.get<{ items: Activity[] }>('/activities?page=1&size=200');
        actsRes.items.forEach((a) => { activityMap[a.id] = a; });
      } catch {}
      setUserReviews(
        revs.map((r) => ({
          ...r,
          user: currentUser,
          activity: activityMap[r.activityId],
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setShowLogin(false);
      loadData();
    }
  }, [currentUser]);

  const handleLogin = async () => {
    const n = nickname.trim();
    if (n.length < 2 || n.length > 20) {
      setNicknameError('昵称需2-20字符');
      return;
    }
    try {
      const u = await api.post('/users', { nickname: n });
      setCurrentUser(u);
    } catch (e: any) {
      setNicknameError(e?.message || '失败');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  if (showLogin) {
    return (
      <div style={{ maxWidth: 420, margin: '40px auto' }}>
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #64B5F6, #1976D2)',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <LogIn size={30} color="#fff" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#212121', marginBottom: 8 }}>欢迎来到读书会</h2>
          <p style={{ fontSize: 14, color: '#757575', marginBottom: 24, lineHeight: 1.6 }}>
            设置您的昵称，即可查看个人活跃度数据和书评记录
          </p>
          <div className="form-group">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入您的昵称（2-20字符）"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              style={{ textAlign: 'center', fontSize: 15, padding: '12px 16px' }}
            />
          </div>
          {nicknameError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px',
              backgroundColor: '#FFEBEE',
              color: '#C62828',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
            }}>
              <AlertCircle size={15} /> {nicknameError}
            </div>
          )}
          <button
            className="btn-primary"
            onClick={handleLogin}
            style={{ width: '100%', padding: '12px 20px', fontSize: 15 }}
          >
            进入个人中心
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: 24,
      }}>
        <div className="card" style={{ padding: 28, textAlign: 'center', height: 'fit-content', position: 'sticky', top: 88 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              backgroundColor: currentUser?.avatarColor,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 700,
              margin: '0 auto 16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            {currentUser?.nickname.charAt(0)}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#212121', marginBottom: 6 }}>
            {currentUser?.nickname}
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            fontSize: 12,
            color: '#9E9E9E',
            marginBottom: 24,
          }}>
            <Calendar size={13} />
            加入于 {currentUser && formatDate(currentUser.createdAt)}
          </div>

          <div style={{
            padding: '20px 16px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #FFF3E0, #E3F2FD)',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 10 }}>
              <Trophy size={18} color="#FFA726" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#E65100' }}>本月活跃度排名</span>
            </div>
            {rank && (
              <>
                <div style={{
                  fontSize: 32,
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #FF7043, #1976D2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}>
                  第 {rank.rank} 名
                </div>
                <div style={{ fontSize: 12, color: '#616161', marginBottom: 8 }}>
                  共 {rank.totalUsers} 位书友参与
                </div>
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: '#fff',
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#2E7D32',
                }}>
                  <TrendingUp size={13} /> 超过 {rank.percent}% 的书友
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: '#9E9E9E' }}>
                  本月累计撰写 <strong style={{ color: '#1976D2' }}>{rank.totalWords}</strong> 字书评
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              setCurrentUser(null);
              setShowLogin(true);
            }}
            style={{
              fontSize: 12,
              color: '#9E9E9E',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              marginTop: 8,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#EF5350'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#9E9E9E'; }}
          >
            切换身份 / 退出
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 className="section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={20} color="#1976D2" /> 近7天活跃度
              </h2>
              <span style={{ fontSize: 12, color: '#9E9E9E' }}>每日书评字数统计</span>
            </div>
            <p style={{ fontSize: 13, color: '#757575', marginBottom: 12 }}>
              坚持写书评，与书友分享阅读感悟，提升你的活跃度排名！
            </p>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9E9E9E' }}>加载中...</div>
            ) : (
              <BarChart data={activityData} />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                我的书评 <span style={{ fontSize: 14, fontWeight: 400, color: '#9E9E9E' }}>（{userReviews.length}）</span>
              </h2>
              <button
                onClick={() => navigate('/')}
                style={{
                  fontSize: 12,
                  color: '#1976D2',
                  fontWeight: 500,
                  backgroundColor: '#E3F2FD',
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                去写新书评 →
              </button>
            </div>
            <ReviewList reviews={userReviews} showActivityName currentUserId={currentUser?.id} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 300px 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
