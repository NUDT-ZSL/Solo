import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Story, Reply, EMOTION_COLORS, EMOTION_LABELS, EmotionType } from '../types';
import { getRelativeTime } from '../utils/time';
import { getEmotionGlow } from '../utils/emotion';   // ★ 情绪光晕函数
import { useStore } from '../store/useStore';
import RippleEffect from './RippleEffect';
import ReplyModal from './ReplyModal';
import { api } from '../utils/api';

interface StoryCardProps {
  story: Story;
  index?: number;
}

/**
 * ★★★ 故事卡片组件 ★★★
 * 功能点1: box-shadow情绪色光晕 - 调用 getEmotionGlow(emotion, hovered)
 *         默认光晕强度0.5，hover时0.75（+50%亮度）
 * 功能点5: 响应式适配 - window.innerWidth <= 768 时圆角 8px
 * 功能点2: 涟漪动画触发 - 提交回响后 trigger RippleEffect
 */
export default function StoryCard({ story, index = 0 }: StoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [rippleTrigger, setRippleTrigger] = useState(false);
  const [hovered, setHovered] = useState(false);   // ★ 控制光晕
  const [mobile, setMobile] = useState(false);     // ★ 控制圆角
  const navigate = useNavigate();

  const loadReplies = useStore(s => s.loadReplies);
  const addReply = useStore(s => s.addReply);
  const replies = useStore(s => s.replies[story.id] || []);

  // ★ 响应式：监听窗口大小变化
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (expanded && replies.length === 0) loadReplies(story.id);
  }, [expanded, story.id, replies.length, loadReplies]);

  const emotionColor = EMOTION_COLORS[story.emotion];

  // ★★★ 1. 情绪色光晕 box-shadow（根据hover状态，悬停时+50%）★★★
  const glowStyle: React.CSSProperties = {
    boxShadow: getEmotionGlow(story.emotion, hovered),
  };

  // ★★★ 5. 响应式：手机端圆角 8px ★★★
  const cardRadius = mobile ? 8 : 20;

  const summary = story.content.length > 100
    ? story.content.slice(0, 100) + '...'
    : story.content;

  // 提交回响：触发涟漪动画 + 更新数据
  const handleReplySubmit = async (content: string, type: 'text' | 'voice', emotion: EmotionType) => {
    const reply = await api.createReply({
      storyId: story.id, content, type, emotion
    });
    addReply(reply);
    setShowReplyModal(false);
    // ★★★ 2. 回响涟漪动画：JS触发CSS动画 ★★★
    setRippleTrigger(true);
  };

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="story-card"
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #1B2A3A 0%, #0F1E2E 100%)',
          borderRadius: cardRadius,     // ★ 响应式圆角
          padding: 20,
          border: '1px solid rgba(255,255,255,0.08)',
          // ★★★ 1. 情绪色光晕 box-shadow ★★★
          ...glowStyle,
          transition: 'box-shadow 0.3s ease, transform 0.3s ease, border-radius 0.3s',
          transform: hovered ? 'translateY(-4px)' : 'none',
          cursor: 'pointer',
          animationDelay: `${index * 0.05}s`
        }}
      >
        {/* ★★★ 2. 涟漪动画 ★★★ */}
        <RippleEffect
          trigger={rippleTrigger}
          emotion={story.emotion}
          onFinished={() => setRippleTrigger(false)}
        />

        {/* 情绪标签圆形色块 (左上角 直径20px) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <span style={{
            width: 20, height: 20, borderRadius: '50%',
            background: emotionColor, flexShrink: 0,
            boxShadow: `0 0 10px ${emotionColor}88`
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              onClick={() => navigate(`/story/${story.id}`)}
              style={{
                fontSize: 16, color: '#fff', marginBottom: 4, cursor: 'pointer',
                fontFamily: "'Noto Serif SC', serif"
              }}
            >{story.title}</h3>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 10,
              background: `${emotionColor}33`, color: emotionColor, display: 'inline-block'
            }}>{EMOTION_LABELS[story.emotion]}</span>
          </div>
        </div>

        <p style={{
          fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16,
          whiteSpace: expanded ? 'pre-wrap' : 'normal'
        }}>
          {expanded ? story.content : summary}
        </p>

        {/* 回响列表（展开后显示） */}
        {expanded && replies.length > 0 && (
          <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              💬 回响 ({replies.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {replies.map(r => <ReplyItem key={r.id} reply={r} />)}
            </div>
          </div>
        )}

        {/* 底部：回响数+时间+操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {getRelativeTime(story.createdAt)}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              💬 {story.replyCount}
            </span>
            <button
              onClick={e => { e.stopPropagation(); setShowReplyModal(true); }}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: 12 }}
            >回响</button>
            <button
              onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: 12 }}
            >{expanded ? '收起' : '展开'}</button>
          </div>
        </div>
      </div>

      {/* 回响模态框 */}
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
  const c = EMOTION_COLORS[reply.emotion];
  return (
    <div style={{
      padding: 12, borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      borderLeft: `3px solid ${c}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {reply.type === 'voice' && <span>🎤</span>}
        <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: `${c}22`, color: c }}>
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
