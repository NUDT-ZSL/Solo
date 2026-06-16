import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvent, registerEvent, checkInEvent, EventItem } from '../api/events';

interface Props {
  events: EventItem[];
  onRefresh: () => void;
}

export default function EventDetail({ onRefresh }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showFullAlert, setShowFullAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    if (!id) return;
    setLoading(true);
    const result = await getEvent(id);
    if ('error' in result) {
      setError(result.error);
    } else {
      setEvent(result);
      const storedPhone = localStorage.getItem('userPhone');
      if (storedPhone && result.participants) {
        const p = result.participants.find((pp) => pp.phone === storedPhone);
        if (p) {
          setIsRegistered(true);
          setIsCheckedIn(p.checkedIn);
        }
      }
    }
    setLoading(false);
  };

  const isEventToday = event?.date === new Date().toISOString().split('T')[0];

  const handleRegister = async () => {
    if (!id || !userName.trim() || !userPhone.trim()) return;
    const result = await registerEvent(id, userName.trim(), userPhone.trim());
    if ('error' in result) {
      if (result.error.includes('已满')) {
        setAlertMsg(result.error);
        setShowFullAlert(true);
      } else {
        setAlertMsg(result.error);
        setShowFullAlert(true);
      }
      return;
    }
    localStorage.setItem('userPhone', userPhone.trim());
    localStorage.setItem('userName', userName.trim());
    setIsRegistered(true);
    setShowRegisterForm(false);
    onRefresh();
    loadEvent();
  };

  const handleCheckIn = async () => {
    if (!id) return;
    const phone = localStorage.getItem('userPhone') || '';
    const result = await checkInEvent(id, phone);
    if ('error' in result) {
      setAlertMsg(result.error);
      setShowFullAlert(true);
      return;
    }
    setIsCheckedIn(true);
    onRefresh();
    loadEvent();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#95A5A6' }}>
        加载中...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#E74C3C' }}>
        {error || '活动不存在'}
      </div>
    );
  }

  const ratio = event.maxParticipants > 0 ? event.participants.length / event.maxParticipants : 0;
  const barColor = ratio < 0.5 ? '#2ECC71' : ratio <= 0.8 ? '#F39C12' : '#E74C3C';

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          color: '#3498DB',
          cursor: 'pointer',
          fontSize: '15px',
          marginBottom: '20px',
          padding: 0,
        }}
      >
        ← 返回日历
      </button>

      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
          {event.title}
        </h1>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', color: '#7f8c8d', fontSize: '14px' }}>
          <span>📅 {event.date}</span>
          <span>👥 {event.participants.length}/{event.maxParticipants} 人</span>
        </div>

        <div
          style={{
            height: '10px',
            background: '#ECF0F1',
            borderRadius: '5px',
            overflow: 'hidden',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${ratio * 100}%`,
              background: barColor,
              borderRadius: '5px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#34495E', marginBottom: '32px' }}>
          {event.description}
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {isRegistered ? (
            <button
              disabled
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                border: 'none',
                background: '#95A5A6',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'not-allowed',
              }}
            >
              已报名
            </button>
          ) : (
            <button
              onClick={() => setShowRegisterForm(true)}
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                border: 'none',
                background: '#3498DB',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'filter 0.3s ease, transform 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              立即报名
            </button>
          )}

          {isEventToday && isRegistered && !isCheckedIn && (
            <button
              onClick={handleCheckIn}
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                border: 'none',
                background: '#2ECC71',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s ease, transform 0.1s ease',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              签到
            </button>
          )}

          {isCheckedIn && (
            <span
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                background: '#27AE60',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
              }}
            >
              已签到 ✓
            </span>
          )}
        </div>

        {event.participants.length > 0 && (
          <div style={{ marginTop: '32px', borderTop: '1px solid #ECF0F1', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
              参与者 ({event.participants.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {event.participants.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#F9F9F9',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  <span>{p.name}</span>
                  {p.checkedIn && (
                    <span style={{ color: '#27AE60', fontSize: '12px' }}>已签到</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showRegisterForm && (
        <div className="modal-overlay" onClick={() => setShowRegisterForm(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
              报名参加「{event.title}」
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#7f8c8d' }}>
                姓名
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="请输入您的姓名"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#7f8c8d' }}>
                联系电话
              </label>
              <input
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="请输入您的联系电话"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRegisterForm(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                取消
              </button>
              <button
                onClick={handleRegister}
                disabled={!userName.trim() || !userPhone.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: !userName.trim() || !userPhone.trim() ? '#BDC3C7' : '#3498DB',
                  color: '#fff',
                  cursor: !userName.trim() || !userPhone.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                确认报名
              </button>
            </div>
          </div>
        </div>
      )}

      {showFullAlert && (
        <div className="modal-overlay" onClick={() => setShowFullAlert(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#E74C3C' }}>
              提示
            </h3>
            <p style={{ fontSize: '15px', color: '#34495E', marginBottom: '24px' }}>
              {alertMsg}
            </p>
            <button
              onClick={() => setShowFullAlert(false)}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#3498DB',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
