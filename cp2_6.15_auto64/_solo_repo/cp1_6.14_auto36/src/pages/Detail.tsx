import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, MessageCircle, Send, Star, BookOpen, User } from 'lucide-react';
import { marked } from 'marked';
import { bookSkill, getSkillDetail, sendMessage, type SkillDetail, type TimeSlot } from '../api';
import { useAppStore } from '../store';
import { categoryIcon, formatTime, Stars } from '../utils';

const DAYS = ['周一', '周二', '周三', '周四', '周五'];
const TIMES = ['09:00', '10:00', '14:00', '15:00', '19:00', '20:00'];

function stripMd(s: string) {
  return s.replace(/[#*`>\n-]/g, '').slice(0, 30);
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [data, setData] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [bookModal, setBookModal] = useState<TimeSlot | null>(null);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getSkillDetail(id)
      .then(setData)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [id]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2200);
  };

  const rendered = useMemo(() => {
    if (!data) return '';
    try {
      return marked.parse(data.description) as string;
    } catch {
      return data.description;
    }
  }, [data]);

  const teacherBio = useMemo(() => {
    if (!data?.teacher?.bio) return '';
    try {
      return marked.parse(data.teacher.bio) as string;
    } catch {
      return data.teacher.bio;
    }
  }, [data]);

  const weekSlots: Record<string, Record<string, TimeSlot | undefined>> = useMemo(() => {
    const map: Record<string, Record<string, TimeSlot | undefined>> = {};
    TIMES.forEach((t) => (map[t] = {}));
    data?.availableSlots.forEach((s) => {
      if (map[s.time]) map[s.time][DAYS[s.dayOfWeek - 1] || '周一'] = s;
    });
    return map;
  }, [data]);

  const handleBook = async () => {
    if (!bookModal || !id) return;
    if (!user) {
      showToast('请先登录再预约', 'error');
      navigate('/login');
      return;
    }
    try {
      await bookSkill(id, bookModal.id, new Date().toISOString().split('T')[0]);
      setBookModal(null);
      showToast('约课请求已发送 ✅');
      if (data) {
        setData({
          ...data,
          availableSlots: data.availableSlots.map((s) =>
            s.id === bookModal.id ? { ...s, booked: true, bookedBy: user._id } : s
          ),
        });
      }
    } catch {
      showToast('预约失败', 'error');
    }
  };

  const handleSend = async () => {
    if (!msgText.trim() || !data?.teacher) return;
    if (!user) { showToast('请先登录', 'error'); navigate('/login'); return; }
    setSending(true);
    try {
      await sendMessage(data.teacher._id, msgText.trim());
      setMsgText('');
      setMsgOpen(false);
      showToast('消息已发送 💌');
    } catch {
      showToast('发送失败', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div>
      <div className="navbar"><div className="container navbar-inner"><Link to="/" className="logo"><div className="logo-circle">S</div><span className="logo-text">SkillSwap</span></Link></div></div>
      <div className="loading"><div className="spinner"></div>加载技能详情…</div>
    </div>
  );

  if (!data) return (
    <div>
      <div className="navbar"><div className="container navbar-inner"><Link to="/" className="logo"><div className="logo-circle">S</div><span className="logo-text">SkillSwap</span></Link></div></div>
      <div className="container page"><div className="empty-state" style={{ background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow)' }}>技能不存在或已被删除 <Link to="/" style={{ color: 'var(--accent)', marginTop: 10 }}>返回首页</Link></div></div>
    </div>
  );

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <button className="nav-link" onClick={() => navigate(-1)} style={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }}>
            <ArrowLeft size={16} /> 返回
          </button>
          <Link to="/" className="logo" style={{ marginLeft: 8 }}>
            <div className="logo-circle">S</div>
            <span className="logo-text">SkillSwap</span>
          </Link>
        </div>
      </nav>

      <div className="container page">
        <div className="breadcrumb">
          <Link to="/">首页</Link> / <Link to="/">技能</Link> / <span>{stripMd(data.title)}</span>
        </div>

        <div className="detail-wrap">
          <div className="detail-left">
            <div className="detail-hero" style={{ background: data.coverColor }}>
              <span className="detail-category">#{data.category}</span>
              <div className="detail-hero-icon">{categoryIcon(data.category)}</div>
            </div>
            <h1 className="detail-title">{data.title}</h1>
            <div className="section-title"><BookOpen size={18} color="var(--accent)" /> 课程介绍</div>
            <div className="markdown" dangerouslySetInnerHTML={{ __html: rendered }} />

            <div className="section-title"><CalendarCheck size={18} color="var(--success)" /> 可约时间段 · 本周</div>
            <div className="calendar-card">
              <div className="calendar-week">
                <div className="cal-head">时间</div>
                {DAYS.map((d) => <div className="cal-head" key={d}>{d}</div>)}
              </div>
              {TIMES.map((t) => (
                <div className="calendar-week" key={t}>
                  <div className="cal-time">{t}</div>
                  {DAYS.map((d) => {
                    const slot = weekSlots[t]?.[d];
                    if (!slot) return <div key={d} />;
                    const cls = `cal-slot ${slot.booked ? 'booked' : 'available'}`;
                    return (
                      <div
                        key={d}
                        className={cls}
                        onClick={() => !slot.booked && setBookModal(slot)}
                        title={slot.booked ? '已被预约' : `点击预约 ${d} ${t}`}
                      >
                        {slot.booked ? '已满' : '可约'}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, display: 'flex', gap: 16 }}>
                <span>🟩 <span className="cal-slot available" style={{ width: 20, height: 14, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /> 可预约</span>
                <span>⬜ <span className="cal-slot booked" style={{ width: 20, height: 14, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /> 已预约</span>
              </div>
            </div>

            {data.teacher?.bio && (
              <>
                <div className="section-title"><User size={18} color="var(--blue)" /> 关于老师</div>
                <div className="markdown" dangerouslySetInnerHTML={{ __html: teacherBio }} />
              </>
            )}
          </div>

          <div className="detail-right">
            <div className="sidebar-card">
              <div className="teacher-profile">
                <img className="teacher-avatar" src={data.teacher?.avatar || data.teacherAvatar} alt={data.teacherName} />
                <div className="teacher-name">{data.teacherName}</div>
                <div className="teacher-rating">
                  <Stars rating={data.teacher?.rating || 4.6} size={18} />
                  <span style={{ marginLeft: 4 }}>{(data.teacher?.rating || 4.6).toFixed(1)}<span style={{ color: '#999', fontWeight: 500 }}>/5</span></span>
                </div>
                {data.teacher?.canTeach?.length > 0 && (
                  <div className="match-tags" style={{ justifyContent: 'center', marginTop: 12 }}>
                    {data.teacher.canTeach.slice(0, 5).map((t) => (
                      <span key={t} className="match-tag teach">#{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary btn-large btn-full"
                style={{ marginTop: 20 }}
                onClick={() => setMsgOpen(!msgOpen)}
              >
                <MessageCircle size={18} /> 发送消息
              </button>

              {msgOpen && (
                <div className="message-input-area">
                  <textarea
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder={`和 ${data.teacherName} 打个招呼吧…`}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={handleSend} disabled={sending || !msgText.trim()}>
                      <Send size={16} /> {sending ? '发送中' : '发送'}
                    </button>
                  </div>
                </div>
              )}

              <div className="section-title" style={{ fontSize: 16 }}>
                <Star size={16} color="var(--gold-star)" /> 学员评价 · {data.reviews?.length || 0}
              </div>
              <div className="reviews-list">
                {!data.reviews?.length ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                    还没有评价
                  </div>
                ) : data.reviews.map((r) => (
                  <div className="review-item" key={r._id}>
                    <img className="review-avatar" src={r.userAvatar} alt={r.userName} />
                    <div className="review-body">
                      <div className="review-head">
                        <span className="review-name">{r.userName}</span>
                        <span className="review-time">{formatTime(r.createdAt)}</span>
                      </div>
                      <div className="review-stars">
                        <Stars rating={r.rating} size={12} />
                      </div>
                      <p className="review-text">{r.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {bookModal && (
        <div className="modal-backdrop" onClick={() => setBookModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">📅 确认预约</h2>
            <p className="modal-desc">
              您即将预约 <strong style={{ color: 'var(--accent)' }}>{DAYS[(bookModal as any).dayOfWeek - 1]} {bookModal.time}</strong> 的课程。<br />
              老师：{data.teacherName}
            </p>
            <div style={{ padding: 14, background: '#f8f9fc', borderRadius: 10, fontSize: 13, color: 'var(--text-soft)' }}>
              💡 提交后将发送约课请求，老师确认后即可上课。
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setBookModal(null)}>取消</button>
              <button className="btn btn-primary" onClick={handleBook}>确认预约</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}
    </>
  );
}
