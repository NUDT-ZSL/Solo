import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Story, Reply, EMOTION_COLORS, EMOTION_LABELS, EmotionType } from '../types';
import { getRelativeTime } from '../utils/time';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import ReplyModal from '../components/ReplyModal';
import RippleEffect from '../components/RippleEffect';

export default function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [ripple, setRipple] = useState(false);
  const [loading, setLoading] = useState(true);
  const addReply = useStore(s => s.addReply);

  useEffect(() => {
    if (id) {
      Promise.all([api.getStory(id), api.getReplies(id)])
        .then(([s, r]) => { setStory(s); setReplies(r); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [id]);

  const submit = async (content: string, type: 'text' | 'voice', emotion: EmotionType) => {
    if (!id) return;
    const r = await api.createReply({ storyId: id, content, type, emotion });
    setReplies(prev => [...prev, r]);
    if (story) setStory({ ...story, replyCount: story.replyCount + 1 });
    addReply(r);
    setShowModal(false);
    setRipple(true);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>加载中...</div>;
  }
  if (!story) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>故事不存在</p>
        <button onClick={() => navigate('/')} className="btn-primary">返回首页</button>
      </div>
    );
  }

  const color = EMOTION_COLORS[story.emotion];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className="btn-primary" style={{ marginBottom: 24, padding: '8px 16px' }}>
        ← 返回
      </button>

      <div className="glass-card" style={{ padding: 32, marginBottom: 24, position: 'relative' }}>
        <RippleEffect trigger={ripple} emotion={story.emotion} onFinished={() => setRipple(false)} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%',
            background: color, boxShadow: `0 0 12px ${color}`
          }} />
          <span style={{
            padding: '4px 12px', borderRadius: 16,
            background: `${color}33`, color, fontSize: 13
          }}>{EMOTION_LABELS[story.emotion]}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {getRelativeTime(story.createdAt)}
          </span>
        </div>

        <h1 style={{ fontSize: 28, marginBottom: 20, fontFamily: "'Noto Serif SC', serif" }}>
          {story.title}
        </h1>

        <p style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
          {story.content}
        </p>

        <div style={{
          marginTop: 24, paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            💬 {story.replyCount} 条回响
          </span>
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{
            background: `${color}33`, border: `1px solid ${color}66`
          }}>留下回响</button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 20, fontFamily: "'Noto Serif SC', serif" }}>
          💬 回响列表
        </h3>

        {replies.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {replies.map(r => {
              const rc = EMOTION_COLORS[r.emotion];
              return (
                <div key={r.id} style={{
                  padding: 16, borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  borderLeft: `3px solid ${rc}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {r.type === 'voice' && <span>🎤</span>}
                    <span style={{
                      fontSize: 12, padding: '2px 8px', borderRadius: 10,
                      background: `${rc}22`, color: rc
                    }}>{EMOTION_LABELS[r.emotion]}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {getRelativeTime(r.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {r.content}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
            还没有回响，来留下第一条吧～
          </p>
        )}
      </div>

      <ReplyModal
        open={showModal}
        storyId={story.id}
        storyEmotion={story.emotion}
        onClose={() => setShowModal(false)}
        onSubmit={submit}
      />
    </div>
  );
}
