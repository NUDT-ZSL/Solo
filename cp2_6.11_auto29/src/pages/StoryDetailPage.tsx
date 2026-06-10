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
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [rippleActive, setRippleActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const addReply = useStore(s => s.addReply);

  useEffect(() => {
    if (id) {
      Promise.all([api.getStory(id), api.getReplies(id)]).then(([s, r]) => {
        setStory(s);
        setReplies(r);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [id]);

  const handleReplySubmit = async (content: string, type: 'text' | 'voice', emotion: EmotionType) => {
    if (!id) return;
    const reply = await api.createReply({ storyId: id, content, type, emotion });
    setReplies(prev => [...prev, reply]);
    if (story) {
      setStory({ ...story, replyCount: story.replyCount + 1 });
    }
    addReply(reply);
    setShowReplyModal(false);
    setRippleActive(true);
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

  const emotionColor = EMOTION_COLORS[story.emotion];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn-primary"
        style={{ marginBottom: 24, padding: '8px 16px' }}
      >
        ← 返回
      </button>

      <div
        className="glass-card"
        style={{ padding: 32, marginBottom: 24, position: 'relative' }}
      >
        <RippleEffect active={rippleActive} emotion={story.emotion} onComplete={() => setRippleActive(false)} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: emotionColor,
              boxShadow: `0 0 12px ${emotionColor}`
            }}
          />
          <span
            style={{
              padding: '4px 12px', borderRadius: 16,
              background: `${emotionColor}33`, color: emotionColor, fontSize: 13
            }}
          >
            {EMOTION_LABELS[story.emotion]}
          </span>
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

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            💬 {story.replyCount} 条回响
          </span>
          <button onClick={() => setShowReplyModal(true)} className="btn-primary" style={{
            background: `${emotionColor}33`,
            border: `1px solid ${emotionColor}66`
          }}>
            留下回响
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 20, fontFamily: "'Noto Serif SC', serif" }}>
          💬 回响列表
        </h3>

        {replies.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {replies.map(reply => {
              const rColor = EMOTION_COLORS[reply.emotion];
              return (
                <div key={reply.id} style={{
                  padding: 16, borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderLeft: `3px solid ${rColor}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {reply.type === 'voice' && <span>🎤</span>}
                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: `${rColor}22`, color: rColor }}>
                      {EMOTION_LABELS[reply.emotion]}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {getRelativeTime(reply.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {reply.content}
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
        open={showReplyModal}
        storyId={story.id}
        storyEmotion={story.emotion}
        onClose={() => setShowReplyModal(false)}
        onSubmit={handleReplySubmit}
      />
    </div>
  );
}
