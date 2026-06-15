import React from 'react';

export type Emotion = 'joy' | 'sadness' | 'confusion' | 'anger';

export interface Message {
  id: string;
  content: string;
  emotion: Emotion;
  timestamp: number;
  resonanceCount: number;
}

export interface HistoryPanelProps {
  messages: Message[];
  onHover: (message: Message) => void;
  onHoverEnd: () => void;
  onResonate: (messageId: string) => void;
  showResetNotice: boolean;
}

const emotionColors: Record<Emotion, string> = {
  joy: '#FFD700',
  sadness: '#5B9BD5',
  confusion: '#9B59B6',
  anger: '#E74C3C',
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function truncateContent(content: string): string {
  if (content.length > 20) {
    return content.slice(0, 20) + '...';
  }
  return content;
}

const panelStyle: React.CSSProperties = {
  width: 220,
  background: 'rgba(10,15,25,0.7)',
  borderRadius: 12,
  padding: 16,
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  maxHeight: 'calc(100vh - 40px)',
  overflowY: 'auto',
  fontFamily: 'sans-serif',
};

const resetNoticeStyle: React.CSSProperties = {
  background: 'rgba(26,188,156,0.3)',
  padding: '8px 12px',
  borderRadius: 8,
  marginBottom: 12,
  fontSize: 13,
  textAlign: 'center',
  animation: 'fadeOut 5s forwards',
};

const messageItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: 10,
  marginBottom: 8,
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const emotionDotStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  marginRight: 10,
  flexShrink: 0,
};

const timeStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.5)',
  marginRight: 8,
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 13,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 100,
};

const resonateButtonStyle: React.CSSProperties = {
  marginLeft: 8,
  padding: '4px 8px',
  fontSize: 11,
  background: 'linear-gradient(135deg, #1ABC9C, #16A085)',
  border: 'none',
  borderRadius: 4,
  color: 'white',
  cursor: 'pointer',
  transition: 'transform 0.1s',
};

const resonanceCountStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.5)',
  marginLeft: 4,
};

function HistoryPanel({
  messages,
  onHover,
  onHoverEnd,
  onResonate,
  showResetNotice,
}: HistoryPanelProps) {
  return (
    <div style={panelStyle}>
      <style>
        {`
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          .history-item:hover {
            background: rgba(255,255,255,0.05);
          }
          .resonate-btn:active {
            transform: scale(0.95);
          }
        `}
      </style>
      {showResetNotice && (
        <div style={resetNoticeStyle}>雾已散尽，新的开始</div>
      )}
      {messages.map((message) => (
        <div
          key={message.id}
          className="history-item"
          style={messageItemStyle}
          onMouseEnter={() => onHover(message)}
          onMouseLeave={onHoverEnd}
          title={message.content}
        >
          <div
            style={{
              ...emotionDotStyle,
              background: emotionColors[message.emotion],
            }}
          />
          <span style={timeStyle}>{formatTime(message.timestamp)}</span>
          <span style={contentStyle}>{truncateContent(message.content)}</span>
          <button
            className="resonate-btn"
            style={resonateButtonStyle}
            onClick={(e) => {
              e.stopPropagation();
              onResonate(message.id);
            }}
          >
            共鸣
          </button>
          <span style={resonanceCountStyle}>{message.resonanceCount}</span>
        </div>
      ))}
    </div>
  );
}

export default HistoryPanel;
