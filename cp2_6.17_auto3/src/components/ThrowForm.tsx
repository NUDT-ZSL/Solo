import React, { useState } from 'react';

const PRESET_COLORS = [
  { name: '珊瑚橙', value: '#f97316' },
  { name: '热情红', value: '#ef4444' },
  { name: '暖阳黄', value: '#eab308' },
  { name: '日落橙', value: '#f59e0b' },
  { name: '蜜桃粉', value: '#fb923c' },
  { name: '玫瑰红', value: '#dc2626' },
];

interface ThrowFormProps {
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; color: string; author: string }) => void;
}

const ThrowForm: React.FC<ThrowFormProps> = ({ onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0].value);
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim() && content.trim();

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim().slice(0, 20),
        content: content.trim().slice(0, 500),
        color,
        author: author.trim().slice(0, 20) || '匿名旅人',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000080',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '480px',
          maxWidth: '100%',
          borderRadius: '16px',
          background: '#fef9ef',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'modalIn 0.25s ease-out',
        }}
      >
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            🍾 扔一个灵感漂流瓶
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '0 4px',
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            灵感标题 <span style={{ color: '#ef4444' }}>*</span>
            <span style={{ fontWeight: 400, marginLeft: '8px' }}>({title.length}/20)</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 20))}
            placeholder="一句话概括你的灵感..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            详细内容 <span style={{ color: '#ef4444' }}>*</span>
            <span style={{ fontWeight: 400, marginLeft: '8px' }}>({content.length}/500)</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder="写下你的创意、故事开头、产品点子或诗句..."
            style={{
              width: '100%',
              height: '120px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              lineHeight: 1.6,
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              选择瓶子颜色
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  title={c.name}
                  style={{
                    width: '36px',
                    height: '44px',
                    borderRadius: '6px 6px 10px 10px',
                    border: color === c.value ? '2px solid #1e293b' : '2px solid transparent',
                    background: c.value,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: color === c.value ? '0 2px 10px rgba(0,0,0,0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', paddingTop: '26px' }}>
            <div
              style={{
                width: '32px',
                height: '48px',
                borderRadius: '6px 6px 12px 12px',
                background: color,
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '20%',
                  top: '30%',
                  width: '18%',
                  height: '30%',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.35)',
                  transform: 'rotate(-20deg)',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            署名 <span style={{ fontWeight: 400 }}>(可选)</span>
          </label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value.slice(0, 20))}
            placeholder="留个昵称吧~"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              height: '44px',
              padding: '0 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            style={{
              width: '160px',
              height: '44px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: !canSubmit || submitting ? 'not-allowed' : 'pointer',
              opacity: !canSubmit || submitting ? 0.6 : 1,
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            }}
            onMouseEnter={(e) => {
              if (canSubmit && !submitting) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)';
            }}
          >
            {submitting ? '扔出去...' : '🌊 扔出去'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThrowForm;
