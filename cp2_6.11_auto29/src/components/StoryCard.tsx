import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Story, Reply, EMOTION_COLORS, EMOTION_LABELS, EmotionType } from '../types';
import { getRelativeTime } from '../utils/time';
import { getEmotionGlow, hexToRgb } from '../utils/emotion';
import { useStore } from '../store/useStore';
import RippleEffect from './RippleEffect';
import ReplyModal from './ReplyModal';
import { api } from '../utils/api';

interface StoryCardProps {
  story: Story;
  index?: number;
}

export default function StoryCard({ story, index = 0 }: StoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [rippleActive, setRippleActive] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  const loadReplies = useStore(s => s.loadReplies);
  const addReply = useStore(s => s.addReply);
  const replies = useStore(s => s.replies[story.id] || []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (expanded && replies.length === 0) {
      loadReplies(story.id);
    }
  }, [expanded, story.id, replies.length, loadReplies]);

  const emotionColor = EMOTION_COLORS[story.emotion];
  const { r, g, b } = hexToRgb(emotionColor);
  const glowIntensity = hovered ? 0.75 : 0.5;

  const summary = story.content.length > 100 ? story.content.slice(0, 100) + '...' : story.content;

  const handleReplySubmit = async (content: string, type: 'text' | 'voice', emotion: EmotionType) => {
    const reply = await api.createReply({
      storyId: story.id,
      content,
      type,
      emotion
    });
    addReply(reply);
    setShowReplyModal(false);
    setRippleActive(true);
  };

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          background: `linear-gradient(135deg, var(--card-gradient-start) 0%, var(--card-gradient-end) 100%)`,
          borderRadius: isMobile ? 8 : 20,
          padding: 20,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: getEmotionGlow(story.emotion, glowIntensity),
          transition: 'box-shadow 0.3s ease, transform 0.3s ease',
          transform: hovered ? 'translateY(-4px)' : 'none',
          cursor: 'pointer',
          animation: `fadeIn 0.5s ease ${index * 0.05}s both`
        }}
      >
        <RippleEffect active={rippleActive} emotion={story.emotion} onComplete={() => setRippleActive(false)} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: emotionColor,
              boxShadow: `0 0 10px ${emotionColor}`,
              flexShrink: 0
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              onClick={() => navigate(`/story/${story.id}`)}
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: 4,
                cursor: 'pointer',
                fontFamily: "'Noto Serif SC', serif",
                transition: 'color 0.3s'
              }}
            >
              {story.title}
            </h3>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 10,
                background: `${emotionColor}33`,
                color: emotionColor,
                display: 'inline-block'
              }}
            >
              {EMOTION_LABELS[story.emotion]}
            </span>
          </div>
        </div>

        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: 16,
            whiteSpace: expanded ? 'pre-wrap' : 'normal',
            overflow: expanded ? 'visible' : 'hidden'
          }}
        >
          {expanded ? story.content : summary}
        </p>

        {expanded && replies.length > 0 && (
          <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              💬 回响 ({replies.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {replies.map(reply => (
                <ReplyItem key={reply.id} reply={reply} />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {getRelativeTime(story.createdAt)}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              💬 {story.replyCount}
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                setShowReplyModal(true);
              }}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: 12 }}
            >
              回响
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: 12 }}
            >
              {expanded ? '收起' : '展开'}
            </button>
          </div>
        </div>
      </div>

      <ReplyModal
        open={showReplyModal}
        storyId={story.id}
        storyEmotion={story.emotion}
        onClose={() => setShowReplyModal(false)}
        onSubmit={handleReplySubmit}
      />
    </>
  );
}

function ReplyItem({ reply }: { reply: Reply }) {
  const color = EMOTION_COLORS[reply.emotion];
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: 'rgba(255, 255, 255, 0.03)',
        borderLeft: `3px solid ${color}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {reply.type === 'voice' && <span>🎤</span>}
        <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: `${color}22`, color }}>
          {EMOTION_LABELS[reply.emotion]}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {getRelativeTime(reply.createdAt)}
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {reply.content}
      </p>
    </div>
  );
}
