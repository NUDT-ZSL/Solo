import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';

interface Stall {
  id: string;
  eventId: string;
  number: string;
  price: number;
  status: 'available' | 'booked';
  userId: string | null;
}

interface Feedback {
  id: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface EventDetail {
  id: string;
  name: string;
  dateTime: string;
  location: string;
  totalStalls: number;
  pricePerStall: number;
  bookedStalls: number;
  stalls: Stall[];
  feedbacks: Feedback[];
}

const EventDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stalls' | 'feedback'>('stalls');
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('error');

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isEventEnded = event ? dayjs(event.dateTime).isBefore(dayjs()) : false;

  const loadEvent = async () => {
    try {
      const res = await fetch(`/api/events/${id}`);
      const data = await res.json();
      setEvent(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  const handleBook = (stall: Stall) => {
    if (!user) {
      setMessage('请先登录后再预订摊位');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (stall.status !== 'available') return;
    setSelectedStall(stall);
    setShowPayModal(true);
  };

  const confirmPay = async () => {
    if (!selectedStall || !user) return;
    try {
      const res = await fetch(`/api/stalls/${selectedStall.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowPayModal(false);
      setSelectedStall(null);
      setMessage('预订成功！');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
      loadEvent();
    } catch (err: any) {
      setMessage(err.message || '预订失败');
      setMessageType('error');
    }
  };

  const submitFeedback = async () => {
    if (!user) return;
    if (rating === 0) {
      setMessage('请选择评分');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, userId: user.id, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowFeedbackModal(false);
      setRating(0);
      setComment('');
      setMessage('反馈提交成功！');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
      loadEvent();
    } catch (err: any) {
      setMessage(err.message || '提交失败');
      setMessageType('error');
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <div className="empty-text">加载中...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="empty-state">
        <div className="empty-icon">❓</div>
        <div className="empty-text">活动不存在</div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {message && (
        <div className={`alert ${messageType === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div className="event-detail-header">
        <div className="event-info">
          <div className="event-detail-name">{event.name}</div>
          <div className="event-detail-meta">
            <span>📅 {dayjs(event.dateTime).format('YYYY-MM-DD HH:mm')}</span>
            <span>📍 {event.location}</span>
            <span>
              🏷️ ¥{event.pricePerStall}/摊位
            </span>
            <span>
              📊 已预订 {event.bookedStalls}/{event.totalStalls}
            </span>
            {isEventEnded && (
              <span style={{ color: '#ef5350', fontWeight: 600 }}>已结束</span>
            )}
          </div>
        </div>
        {isEventEnded && user && (
          <button className="btn btn-primary" onClick={() => setShowFeedbackModal(true)}>
            ✍️ 提交反馈
          </button>
        )}
      </div>

      <div className="tabs">
        <div className={`tab ${activeTab === 'stalls' ? 'active' : ''}`} onClick={() => setActiveTab('stalls')}>
          摊位列表
        </div>
        <div className={`tab ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>
          活动反馈
        </div>
      </div>

      {activeTab === 'stalls' && (
        <div>
          {event.stalls.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏪</div>
              <div className="empty-text">暂无摊位信息</div>
            </div>
          ) : (
            <div className="stalls-grid">
              {event.stalls.map((stall) => {
                const isMine = stall.userId === user?.id;
                return (
                  <div
                    key={stall.id}
                    className={`stall-item ${isMine ? 'mine' : stall.status}`}
                    onClick={() => (stall.status === 'available' ? handleBook(stall) : null)}
                  >
                    <div className="stall-number">{stall.number}</div>
                    <div className="stall-price">¥{stall.price}</div>
                    <div className={`stall-status ${isMine ? 'mine' : stall.status}`}>
                      {isMine ? '我已预订' : stall.status === 'available' ? '可预订' : '已预订'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="card">
          {event.feedbacks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <div className="empty-text">暂无反馈</div>
            </div>
          ) : (
            event.feedbacks.map((fb) => (
              <div key={fb.id} className="feedback-item">
                <div className="feedback-header">
                  <span className="feedback-user">{fb.userEmail}</span>
                  <span className="feedback-stars">{'⭐'.repeat(fb.rating)}</span>
                </div>
                {fb.comment && <div className="feedback-comment">{fb.comment}</div>}
                <div className="feedback-date">{dayjs(fb.createdAt).format('YYYY-MM-DD HH:mm')}</div>
              </div>
            ))
          )}
        </div>
      )}

      {showPayModal && selectedStall && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">确认支付</div>
            <p style={{ marginBottom: 12 }}>
              摊位编号：<strong>{selectedStall.number}</strong>
            </p>
            <p style={{ marginBottom: 20 }}>
              支付金额：<strong style={{ color: '#ef5350', fontSize: 20 }}>¥{selectedStall.price}</strong>
            </p>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              💡 模拟支付，点击确认即完成预订
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowPayModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={confirmPay}>
                确认支付
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">提交活动反馈</div>
            <div className="form-group">
              <label className="form-label">评分</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${(hoverRating || rating) >= star ? 'active' : ''}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">文字点评（限200字）</label>
              <textarea
                className="form-input"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 200))}
                placeholder="请分享您的活动体验..."
              />
              <div style={{ textAlign: 'right', fontSize: 12, color: '#999', marginTop: 4 }}>
                {comment.length}/200
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowFeedbackModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={submitFeedback}>
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailPage;
