import React, { useState } from 'react';

interface NoteBubblePosition {
  top: number;
  left: number;
}

interface NoteBubbleProps {
  visible: boolean;
  lat: number;
  lng: number;
  position: NoteBubblePosition;
  onSubmit: (text: string) => void;
  onClose: () => void;
}

const NoteBubble: React.FC<NoteBubbleProps> = ({
  visible,
  position,
  onSubmit,
  onClose,
}) => {
  const [text, setText] = useState('');

  if (!visible) return null;

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      onSubmit(trimmed);
      setText('');
    }
  };

  const handleCancel = () => {
    setText('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <div
      className="note-bubble"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: '#ffffff',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1001,
        width: '220px',
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 50))}
        onKeyDown={handleKeyDown}
        maxLength={50}
        rows={2}
        placeholder="添加备注..."
        style={{
          width: '100%',
          fontSize: '13px',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '6px 8px',
          resize: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#3b82f6';
          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e2e8f0';
          e.target.style.boxShadow = 'none';
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '6px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          {text.length}/50
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleCancel}
            style={{
              background: '#e2e8f0',
              color: '#475569',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#cbd5e1')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#e2e8f0')}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={text.trim().length === 0}
            style={{
              background: text.trim().length > 0 ? '#3b82f6' : '#93c5fd',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              cursor: text.trim().length > 0 ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s ease',
            }}
            onMouseOver={(e) => {
              if (text.trim().length > 0) {
                e.currentTarget.style.background = '#2563eb';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = text.trim().length > 0 ? '#3b82f6' : '#93c5fd';
            }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteBubble;
