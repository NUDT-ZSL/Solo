import React, { useEffect, useRef, useState } from 'react';
import { Inspiration, Comment } from '../types';
import { drawShape } from './utils/drawingUtils';

interface InspirationFeedProps {
  inspirations: Inspiration[];
  onVote: (id: string, type: 'up' | 'down') => Promise<void>;
  onAddComment: (id: string, content: string) => Promise<void>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  userVotes: Record<string, 'up' | 'down'>;
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ThumbnailCanvas: React.FC<{ inspiration: Inspiration; size?: number }> = ({
  inspiration,
  size = 50
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const shape = inspiration.shape;

    const scaleX = (size - 10) / Math.max(shape.width, 1);
    const scaleY = (size - 10) / Math.max(shape.height, 1);
    const scale = Math.min(scaleX, scaleY, 1);

    const offsetX = (canvas.width - shape.width * scale) / 2;
    const offsetY = (canvas.height - shape.height * scale) / 2;

    drawShape(ctx, shape, scale, offsetX, offsetY);
  }, [inspiration, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block' }} />;
};

const DetailCanvas: React.FC<{ inspiration: Inspiration }> = ({ inspiration }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawShape(ctx, inspiration.shape);
  }, [inspiration]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      style={{
        width: '100%',
        maxWidth: '400px',
        border: '1px solid #0f3460',
        borderRadius: '8px'
      }}
    />
  );
};

const CommentSection: React.FC<{
  comments: Comment[];
  onSubmit: (content: string) => void;
}> = ({ comments, onSubmit }) => {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim() && input.length <= 200) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  const sortedComments = [...comments].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '14px', color: '#e0e0e0', marginBottom: '8px', fontWeight: 'bold' }}>
        评论 ({comments.length})
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value.slice(0, 200))}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="输入评论，按 Enter 提交..."
        maxLength={200}
        style={{
          width: '100%',
          padding: '10px 12px',
          backgroundColor: '#1a1a2e',
          color: '#e0e0e0',
          border: `1px solid ${isFocused ? '#0f3460' : '#0f3460'}`,
          borderRadius: '6px',
          outline: 'none',
          fontSize: '13px',
          boxShadow: isFocused ? '0 0 6px rgba(15, 52, 96, 0.6)' : 'none',
          transition: 'all 0.2s ease',
          boxSizing: 'border-box'
        }}
      />
      <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', textAlign: 'right' }}>
        {input.length}/200
      </div>
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
        {sortedComments.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', padding: '16px' }}>
            暂无评论，来发表第一条吧！
          </div>
        ) : (
          sortedComments.map((comment) => (
            <div
              key={comment.id}
              style={{
                padding: '10px',
                backgroundColor: '#1a1a2e',
                borderRadius: '6px',
                border: '1px solid #0f3460'
              }}
            >
              <div style={{ fontSize: '13px', color: '#e0e0e0', lineHeight: 1.5 }}>
                {comment.content}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                {formatTime(comment.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const VoteArrow: React.FC<{
  direction: 'up' | 'down';
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ direction, active, disabled, onClick }) => {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    setAnimating(true);
    onClick();
    setTimeout(() => setAnimating(false), 150);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: '4px',
        transition: 'all 0.15s ease',
        transform: animating ? 'scale(1.2)' : 'scale(1)',
        color: active ? (direction === 'up' ? '#4ECDC4' : '#e94560') : disabled ? '#555' : '#e0e0e0',
        opacity: disabled ? 0.5 : 1
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: direction === 'down' ? 'rotate(180deg)' : 'none' }}
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
};

const InspirationCard: React.FC<{
  inspiration: Inspiration;
  isSelected: boolean;
  onToggle: () => void;
  onVote: (type: 'up' | 'down') => void;
  userVote: 'up' | 'down' | undefined;
  onAddComment: (content: string) => void;
}> = ({ inspiration, isSelected, onToggle, onVote, userVote, onAddComment }) => {
  const netVotes = inspiration.upVotes - inspiration.downVotes;

  return (
    <div
      style={{
        backgroundColor: '#16213e',
        borderRadius: '10px',
        border: `1px solid ${isSelected ? '#0f3460' : '#0f3460'}`,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? '0 0 12px rgba(15, 52, 96, 0.4)' : 'none'
      }}
    >
      <div
        onClick={onToggle}
        style={{
          padding: '12px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <div
          style={{
            width: '50px',
            height: '50px',
            backgroundColor: '#1a1a2e',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <ThumbnailCanvas inspiration={inspiration} size={50} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
            {formatTime(inspiration.timestamp)}
          </div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 'bold',
              color: netVotes >= 0 ? '#4ECDC4' : '#e94560'
            }}
          >
            {netVotes >= 0 ? '+' : ''}
            {netVotes} 票
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#888"
          strokeWidth="2"
          style={{
            transform: isSelected ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div style={{ padding: '0 12px 12px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <VoteArrow
          direction="up"
          active={userVote === 'up'}
          disabled={userVote !== undefined}
          onClick={() => onVote('up')}
        />
        <VoteArrow
          direction="down"
          active={userVote === 'down'}
          disabled={userVote !== undefined}
          onClick={() => onVote('down')}
        />
        <div style={{ marginLeft: '8px', fontSize: '12px', color: '#888' }}>
          {inspiration.comments.length} 条评论
        </div>
      </div>

      {isSelected && (
        <div
          style={{
            padding: '12px',
            borderTop: '1px solid #0f3460',
            backgroundColor: '#1a1a2e'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <DetailCanvas inspiration={inspiration} />
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#888',
              padding: '10px',
              backgroundColor: '#16213e',
              borderRadius: '6px',
              fontFamily: 'monospace'
            }}
          >
            <div>类型: {inspiration.shape.type}</div>
            <div>
              中心: ({Math.round(inspiration.shape.centerX)}, {Math.round(inspiration.shape.centerY)})
            </div>
            <div>
              尺寸: {Math.round(inspiration.shape.width)} × {Math.round(inspiration.shape.height)}
            </div>
            <div>颜色: {inspiration.shape.color}</div>
            <div>旋转: {inspiration.shape.rotation}°</div>
          </div>
          <CommentSection comments={inspiration.comments} onSubmit={onAddComment} />
        </div>
      )}
    </div>
  );
};

const InspirationFeed: React.FC<InspirationFeedProps> = ({
  inspirations,
  onVote,
  onAddComment,
  selectedId,
  onSelect,
  userVotes
}) => {
  const sortedInspirations = [...inspirations].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#16213e'
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #0f3460',
          backgroundColor: '#16213e'
        }}
      >
        <h2 style={{ fontSize: '18px', color: '#e0e0e0', marginBottom: '4px' }}>灵感列表</h2>
        <div style={{ fontSize: '12px', color: '#888' }}>
          共 {inspirations.length} 个灵感
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {sortedInspirations.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: '13px'
            }}
          >
            还没有灵感，去画板绘制第一个吧！
          </div>
        ) : (
          sortedInspirations.map((inspiration) => (
            <InspirationCard
              key={inspiration.id}
              inspiration={inspiration}
              isSelected={selectedId === inspiration.id}
              onToggle={() => onSelect(selectedId === inspiration.id ? null : inspiration.id)}
              onVote={(type) => onVote(inspiration.id, type)}
              userVote={userVotes[inspiration.id]}
              onAddComment={(content) => onAddComment(inspiration.id, content)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default InspirationFeed;
