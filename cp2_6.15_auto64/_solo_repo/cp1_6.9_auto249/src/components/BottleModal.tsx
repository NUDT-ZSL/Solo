import { useState, useEffect, useRef } from 'react';
import type { Bottle, Emotion, Relay } from '../utils/api';

interface BottleModalProps {
  bottle: Bottle;
  emotionLabels: Record<Emotion, { label: string; color: string }>;
  onClose: () => void;
  onAddRelay: (bottleId: string, content: string, emotion: Emotion) => void;
}

export default function BottleModal({
  bottle,
  emotionLabels,
  onClose,
  onAddRelay,
}: BottleModalProps) {
  const [relayContent, setRelayContent] = useState('');
  const [relayEmotion, setRelayEmotion] = useState<Emotion>('calm');
  const [corkAnimating, setCorkAnimating] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setCorkAnimating(false), 400);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', check);
    };
  }, []);

  const handleSubmitRelay = () => {
    if (!relayContent.trim()) return;
    onAddRelay(bottle.id, relayContent.trim(), relayEmotion);
    setRelayContent('');
    setRelayEmotion('calm');
    setTimeout(() => {
      contentRef.current?.scrollTo({
        top: contentRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  };

  const color = emotionLabels[bottle.emotion].color;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: isMobile ? '100%' : '100%',
          maxWidth: isMobile ? '100%' : 640,
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : '88vh',
          background:
            'linear-gradient(145deg, rgba(26, 42, 74, 0.97) 0%, rgba(42, 58, 90, 0.97) 50%, rgba(30, 50, 80, 0.97) 100%)',
          borderRadius: isMobile ? 0 : 28,
          border: `1px solid ${color}44`,
          boxShadow: `0 30px 80px rgba(0, 0, 0, 0.6), 0 0 60px ${color}22`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: isMobile
            ? 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 飞出的瓶塞 */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: '50%',
            transform: corkAnimating
              ? 'translate(-50%, 0) rotate(0deg)'
              : 'translate(calc(-50% + 150px), -200px) rotate(720deg)',
            opacity: corkAnimating ? 1 : 0,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 10,
            pointerEvents: 'none',
            fontSize: 28,
          }}
        >
          🪵
        </div>

        {/* 顶部装饰条 */}
        <div
          style={{
            height: 4,
            background: `linear-gradient(90deg, ${color}00 0%, ${color} 50%, ${color}00 100%)`,
            boxShadow: `0 0 20px ${color}88`,
          }}
        />

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: isMobile ? 16 : 20,
            right: isMobile ? 16 : 24,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid rgba(100, 180, 255, 0.3)',
            background: 'rgba(10, 22, 40, 0.6)',
            color: '#8ab4d8',
            fontSize: 18,
            cursor: 'pointer',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(100, 60, 60, 0.8)';
            e.currentTarget.style.color = '#ff8888';
            e.currentTarget.style.borderColor = 'rgba(255, 100, 100, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(10, 22, 40, 0.6)';
            e.currentTarget.style.color = '#8ab4d8';
            e.currentTarget.style.borderColor = 'rgba(100, 180, 255, 0.3)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.9)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ✕
        </button>

        {/* 头部 */}
        <div
          style={{
            padding: isMobile ? '56px 24px 20px' : '48px 40px 20px',
            position: 'relative',
          }}
        >
          {/* 大瓶子装饰 */}
          <div
            style={{
              position: 'absolute',
              top: isMobile ? 48 : 40,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 60,
              height: 60,
              opacity: 0.08,
              fontSize: 60,
              lineHeight: 1,
            }}
          >
            🍾
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: `2px solid ${color}`,
                color,
                fontSize: 14,
                fontWeight: 600,
                boxShadow: `0 0 18px ${color}55`,
                background: `${color}15`,
              }}
            >
              {emotionLabels[bottle.emotion].label}
            </span>
            <span style={{ color: '#8ab4d8', fontSize: 13 }}>
              🌊 接力 {bottle.relays.length} 次
            </span>
          </div>

          <div
            style={{
              color: '#e0f0ff',
              fontSize: isMobile ? 16 : 17,
              lineHeight: 1.8,
              textAlign: 'center',
              padding: isMobile ? '16px 4px' : '20px 8px',
              borderTop: '1px solid rgba(100, 180, 255, 0.1)',
              borderBottom: '1px solid rgba(100, 180, 255, 0.1)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {bottle.content}
          </div>
        </div>

        {/* 接力树区域 */}
        <div
          ref={contentRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '16px 20px' : '20px 40px',
          }}
        >
          {bottle.relays.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '30px 20px',
                color: '#6b8ca8',
                fontSize: 13,
              }}
            >
              🌊 这个漂流瓶还没有被接力，成为第一个留下思绪的人吧~
            </div>
          ) : (
            <RelayTree
              relays={bottle.relays}
              emotionLabels={emotionLabels}
              isMobile={isMobile}
            />
          )}
        </div>

        {/* 底部接力输入区 */}
        <div
          style={{
            padding: isMobile ? '16px 20px 24px' : '20px 40px 32px',
            borderTop: '1px solid rgba(100, 180, 255, 0.15)',
            background: 'linear-gradient(0deg, rgba(10, 22, 40, 0.6) 0%, transparent 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            {(Object.keys(emotionLabels) as Emotion[]).map((em) => {
              const active = relayEmotion === em;
              const c = emotionLabels[em].color;
              return (
                <button
                  key={em}
                  onClick={() => setRelayEmotion(em)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 16,
                    border: `1.5px solid ${c}${active ? '' : '55'}`,
                    background: active ? `${c}22` : 'transparent',
                    color: c,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: active ? 600 : 400,
                    boxShadow: active ? `0 0 12px ${c}44` : 'none',
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {emotionLabels[em].label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                maxLength={140}
                value={relayContent}
                onChange={(e) => setRelayContent(e.target.value)}
                placeholder="写下你的思绪，加入这段漂流的故事..."
                style={{
                  width: '100%',
                  minHeight: 60,
                  padding: '12px 14px 28px',
                  borderRadius: 16,
                  border: `1px solid ${
                    relayContent.trim()
                      ? emotionLabels[relayEmotion].color + '88'
                      : 'rgba(100, 180, 255, 0.25)'
                  }`,
                  background: 'rgba(10, 22, 40, 0.6)',
                  color: '#e0f0ff',
                  fontSize: 14,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                  boxSizing: 'border-box',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = emotionLabels[relayEmotion].color + 'aa';
                  e.target.style.boxShadow = `0 0 16px ${emotionLabels[relayEmotion].color}22`;
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 12,
                  fontSize: 11,
                  color: relayContent.length >= 140 ? '#FF6B35' : '#6b8ca8',
                }}
              >
                {relayContent.length}/140
              </div>
            </div>
            <button
              onClick={handleSubmitRelay}
              disabled={!relayContent.trim()}
              style={{
                padding: isMobile ? '12px 18px' : '14px 22px',
                borderRadius: 16,
                border: 'none',
                background: relayContent.trim()
                  ? `linear-gradient(135deg, ${color} 0%, ${emotionLabels[relayEmotion].color} 100%)`
                  : 'rgba(80, 80, 80, 0.3)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: relayContent.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: relayContent.trim()
                  ? `0 4px 20px ${color}55`
                  : 'none',
              }}
              onMouseDown={(e) => {
                if (relayContent.trim())
                  e.currentTarget.style.transform = 'scale(0.96) translateY(2px)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
              }}
            >
              🌊 接力
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          0% { opacity: 0; transform: scale(0.82); }
          60% { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes corkFly {
          0% { transform: translate(-50%, 0) rotate(0); opacity: 1; }
          100% { transform: translate(150px, -250px) rotate(640deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

interface RelayTreeProps {
  relays: Relay[];
  emotionLabels: Record<Emotion, { label: string; color: string }>;
  isMobile: boolean;
}

function RelayTree({ relays, emotionLabels, isMobile }: RelayTreeProps) {
  return (
    <div style={{ position: 'relative' }}>
      {/* 连接线SVG */}
      <svg
        style={{
          position: 'absolute',
          left: isMobile ? 18 : 24,
          top: 0,
          bottom: 0,
          width: 2,
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            {relays.map((r, i) => {
              const c = emotionLabels[r.emotion].color;
              const offset1 = (i / relays.length) * 100;
              const offset2 = ((i + 1) / relays.length) * 100;
              return (
                <g key={i}>
                  <stop offset={`${offset1}%`} stopColor={c} stopOpacity="0.7" />
                  <stop offset={`${offset2}%`} stopColor={c} stopOpacity="0.4" />
                </g>
              );
            })}
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="100%"
          stroke="url(#lineGrad)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {relays.map((r, i) => {
        const c = emotionLabels[r.emotion].color;
        return (
          <div
            key={r.id}
            style={{
              position: 'relative',
              paddingLeft: isMobile ? 52 : 64,
              paddingBottom: isMobile ? 18 : 22,
              zIndex: 1,
              animation: `relayIn 0.4s ease ${Math.min(i, 15) * 0.05}s both`,
            }}
          >
            {/* 节点圆点 */}
            <div
              style={{
                position: 'absolute',
                left: isMobile ? 11 : 17,
                top: 8,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: c,
                boxShadow: `0 0 14px ${c}, 0 0 30px ${c}55`,
                border: '3px solid #0a1628',
              }}
            />

            {/* 连接线（横向小分支） */}
            <div
              style={{
                position: 'absolute',
                left: isMobile ? 27 : 33,
                top: 15,
                width: isMobile ? 14 : 20,
                height: 1.5,
                background: `linear-gradient(90deg, ${c}, transparent)`,
              }}
            />

            <div
              style={{
                padding: isMobile ? '12px 14px' : '14px 18px',
                borderRadius: isMobile ? 12 : 14,
                background: `linear-gradient(135deg, ${c}15 0%, ${c}08 100%)`,
                border: `1px solid ${c}33`,
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: 10,
                    border: `1px solid ${c}88`,
                    color: c,
                    fontSize: 11,
                    fontWeight: 600,
                    background: `${c}18`,
                  }}
                >
                  {emotionLabels[r.emotion].label}
                </span>
                <span style={{ color: '#6b8ca8', fontSize: 11 }}>
                  接力 #{i + 1}
                </span>
              </div>
              <div
                style={{
                  color: '#d0e4f5',
                  fontSize: isMobile ? 13.5 : 14,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {r.content}
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes relayIn {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
