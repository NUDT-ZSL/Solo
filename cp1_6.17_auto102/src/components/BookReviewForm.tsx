import { useEffect, useMemo, useState } from 'react';
import { X, Star, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import type { Activity, Review } from '../../shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultActivityId?: string;
  editingReview?: Review & { activity?: Activity } | null;
}

const BookReviewForm = ({ open, onClose, onSuccess, defaultActivityId, editingReview }: Props) => {
  const { currentUser, setCurrentUser } = useUserStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityId, setActivityId] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [nickname, setNickname] = useState('');
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showTip, setShowTip] = useState(false);
  const [tipShown, setTipShown] = useState(false);

  const wordCount = useMemo(() => {
    const zh = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const en = (content.match(/[a-zA-Z]+/g) || []).length;
    return zh + en;
  }, [content]);

  const contentValid = wordCount >= 50 && wordCount <= 500;

  useEffect(() => {
    if (open) {
      api.get<{ items: Activity[] }>('/activities?page=1&size=100')
        .then((r) => setActivities(r.items))
        .catch(() => {});
      if (editingReview) {
        setActivityId(editingReview.activityId);
        setBookTitle(editingReview.bookTitle);
        setContent(editingReview.content);
        setRating(editingReview.rating);
      } else {
        setActivityId(defaultActivityId || '');
        setBookTitle('');
        setContent('');
        setRating(5);
      }
      setErrorMsg('');
      setShowTip(false);
      setTipShown(false);
    }
  }, [open, defaultActivityId, editingReview]);

  useEffect(() => {
    if (wordCount >= 400 && wordCount <= 500 && !tipShown) {
      setShowTip(true);
      setTipShown(true);
      const t = setTimeout(() => setShowTip(false), 3000);
      return () => clearTimeout(t);
    }
  }, [wordCount, tipShown]);

  if (!open) return null;

  const doSubmit = async () => {
    if (!currentUser) {
      setShowNicknamePrompt(true);
      return;
    }
    if (!activityId) return setErrorMsg('请选择关联活动');
    if (!bookTitle.trim()) return setErrorMsg('请输入书籍名称');
    if (!contentValid) return setErrorMsg(wordCount < 50 ? `书评至少50字（当前${wordCount}字）` : `书评最多500字（当前${wordCount}字）`);

    setSubmitting(true);
    setErrorMsg('');
    try {
      if (editingReview) {
        await api.put(`/reviews/${editingReview.id}`, { bookTitle, content, rating });
      } else {
        await api.post('/reviews', {
          userId: currentUser.id,
          activityId,
          bookTitle,
          content,
          rating,
        });
      }
      setSubmitting(false);
      onSuccess();
      onClose();
    } catch (e: any) {
      setSubmitting(false);
      setErrorMsg(e?.message || '提交失败');
    }
  };

  const handleNicknameSubmit = async () => {
    const n = nickname.trim();
    if (n.length < 2 || n.length > 20) return setErrorMsg('昵称需2-20字符');
    try {
      const u = await api.post('/users', { nickname: n });
      setCurrentUser(u);
      setShowNicknamePrompt(false);
      setErrorMsg('');
      setTimeout(() => doSubmit(), 50);
    } catch (e: any) {
      setErrorMsg(e?.message || '登录失败');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingReview ? '编辑书评' : '写书评'}</h2>
          <button className="modal-close" onClick={onClose}><X size={22} /></button>
        </div>

        {!showNicknamePrompt ? (
          <>
            <div className="form-group">
              <label className="form-label">关联活动</label>
              <select value={activityId} onChange={(e) => setActivityId(e.target.value)}>
                <option value="">请选择活动...</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">书籍名称</label>
              <input
                type="text"
                placeholder="例如：《百年孤独》"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                maxLength={60}
              />
            </div>

            <div className="form-group">
              <label className="form-label">书评正文</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="分享你的阅读感受...（50-500字）"
                rows={6}
                style={{
                  borderColor: !contentValid && content.length > 0 ? '#FF5252' : undefined,
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 6,
                fontSize: 12,
              }}>
                <span style={{
                  color: !contentValid && content.length > 0 ? '#FF5252' : '#9E9E9E',
                  fontWeight: 500,
                }}>
                  {wordCount} / 500 字
                </span>
                {showTip && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: '#1976D2',
                    fontWeight: 500,
                    animation: 'fadeIn 0.3s ease',
                  }}>
                    <Sparkles size={13} /> 再写一些就可以提交了！
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">评分</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const v = i + 1;
                  const active = (hoverRating || rating) >= v;
                  return (
                    <button
                      key={i}
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 4,
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                      }}
                      onMouseEnter={() => setHoverRating(v)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(v)}
                    >
                      <Star
                        size={26}
                        fill={active ? '#FFB300' : 'transparent'}
                        color={active ? '#FFB300' : '#BDBDBD'}
                        strokeWidth={2}
                      />
                    </button>
                  );
                })}
                <span style={{ marginLeft: 10, fontSize: 13, color: '#616161' }}>
                  {rating} 分
                </span>
              </div>
            </div>

            {errorMsg && (
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
                <AlertCircle size={15} /> {errorMsg}
              </div>
            )}

            {currentUser && (
              <div style={{
                fontSize: 12,
                color: '#757575',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                当前身份：<strong style={{ color: '#424242' }}>{currentUser.nickname}</strong>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={onClose}>取消</button>
              <button className="btn-primary" onClick={doSubmit} disabled={submitting}>
                {submitting ? '提交中...' : editingReview ? '保存修改' : '提交书评'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 20, fontSize: 14, color: '#424242', lineHeight: 1.6 }}>
              提交书评前，请先设置您的昵称，以便其他书友认识您～
            </div>
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
            {errorMsg && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: '#FFEBEE',
                color: '#C62828',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}>
                {errorMsg}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setShowNicknamePrompt(false)}>返回</button>
              <button className="btn-primary" onClick={handleNicknameSubmit}>确定并提交</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookReviewForm;
