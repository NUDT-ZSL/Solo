import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, MapPin, Users, ArrowLeft, PenLine, AlertCircle } from 'lucide-react';
import BookReviewForm from '../components/BookReviewForm';
import ReviewList from '../components/ReviewList';
import { api } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import type { ActivityDetail, Review, User } from '../../shared/types';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const ActivityDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useUserStore();
  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<(Review & { user: User }) | null>(null);
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const refresh = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await api.get<ActivityDetail>(`/activities/${id}`);
      setDetail(d);
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [id]);

  const isRegistered = !!currentUser && !!detail?.registeredUsers.find((u) => u.id === currentUser.id);

  const handleRegisterClick = async () => {
    if (!currentUser) {
      setShowNicknamePrompt(true);
      return;
    }
    setActionLoading(true);
    try {
      if (isRegistered) {
        await api.delete(`/activities/${id}/register`, { userId: currentUser.id });
      } else {
        await api.post(`/activities/${id}/register`, { nickname: currentUser.nickname });
      }
      await refresh();
    } catch (e: any) {
      alert(e?.message || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNicknameSubmit = async () => {
    const n = nickname.trim();
    if (n.length < 2 || n.length > 20) {
      setNicknameError('昵称需2-20字符');
      return;
    }
    setActionLoading(true);
    setNicknameError('');
    try {
      const u = await api.post('/users', { nickname: n });
      setCurrentUser(u);
      setShowNicknamePrompt(false);
      await api.post(`/activities/${id}/register`, { nickname: n });
      await refresh();
    } catch (e: any) {
      setNicknameError(e?.message || '失败');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="card" style={{ padding: 60, textAlign: 'center', color: '#9E9E9E' }}>加载中...</div>;
  }
  if (error || !detail) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#C62828', marginBottom: 20 }}>{error || '活动不存在'}</p>
        <button className="btn-primary" onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 14px',
          marginBottom: 20,
          backgroundColor: '#fff',
          border: '1px solid #E0E0E0',
          borderRadius: 10,
          color: '#424242',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F5F5F5'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
      >
        <ArrowLeft size={15} /> 返回
      </button>

      <div
        style={{
          background: 'linear-gradient(135deg, #F3E5F5 0%, #E8F5E9 100%)',
          borderRadius: 16,
          padding: '32px 36px',
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#212121', marginBottom: 16, lineHeight: 1.4 }}>
          {detail.name}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20, fontSize: 14, color: '#424242' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={16} color="#7E57C2" />
            <span>{formatDate(detail.date)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={16} color="#43A047" />
            <span>{detail.location}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={16} color="#1976D2" />
            <span>已报名 <strong style={{ color: '#1976D2' }}>{detail.registrationCount}</strong> 人</span>
          </div>
        </div>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.65)',
          borderRadius: 12,
          padding: 16,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.8,
          color: '#333',
          fontSize: 14,
        }}>
          {detail.description}
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>报名用户</h2>
          <button
            onClick={handleRegisterClick}
            disabled={actionLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              borderRadius: 12,
              backgroundColor: isRegistered ? '#EF5350' : '#1976D2',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: actionLoading ? 0.7 : 1,
            }}
          >
            {actionLoading ? '处理中...' : isRegistered ? '✓ 取消报名' : '+ 我要报名'}
          </button>
        </div>

        {detail.registeredUsers.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9E9E9E', fontSize: 13 }}>
            还没有人报名，快来成为第一位吧～
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {detail.registeredUsers.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  title={u.nickname}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: u.avatarColor,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 16,
                    border: '2px solid #fff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                >
                  {u.nickname.charAt(0)}
                </div>
                <span style={{ fontSize: 12, color: '#616161', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.nickname}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            书友书评 <span style={{ fontSize: 14, fontWeight: 400, color: '#9E9E9E' }}>（{detail.reviews.length}）</span>
          </h2>
          <button
            onClick={() => { setEditingReview(null); setShowReviewForm(true); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              borderRadius: 12,
              backgroundColor: '#66BB6A',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#43A047'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#66BB6A'; }}
          >
            <PenLine size={15} /> 写书评
          </button>
        </div>

        <ReviewList
          reviews={detail.reviews}
          onEdit={(r) => { setEditingReview(r); setShowReviewForm(true); }}
          currentUserId={currentUser?.id}
        />
      </div>

      <BookReviewForm
        open={showReviewForm}
        onClose={() => { setShowReviewForm(false); setEditingReview(null); }}
        onSuccess={() => setTimeout(refresh, 50)}
        defaultActivityId={id}
        editingReview={editingReview}
      />

      {showNicknamePrompt && (
        <div className="modal-overlay" onClick={() => setShowNicknamePrompt(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>设置昵称</h2>
              <button className="modal-close" onClick={() => setShowNicknamePrompt(false)}>×</button>
            </div>
            <p style={{ fontSize: 14, color: '#424242', marginBottom: 18, lineHeight: 1.6 }}>
              报名前请先设置您的昵称，方便书友们认识您～
            </p>
            <div className="form-group">
              <label className="form-label">您的昵称（2-20字符）</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例如：爱读书的小明"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleNicknameSubmit()}
              />
            </div>
            {nicknameError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 12px',
                backgroundColor: '#FFEBEE',
                color: '#C62828',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}>
                <AlertCircle size={15} /> {nicknameError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setShowNicknamePrompt(false)}>取消</button>
              <button className="btn-primary" onClick={handleNicknameSubmit} disabled={actionLoading}>
                {actionLoading ? '处理中...' : '确定并报名'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityDetailPage;
