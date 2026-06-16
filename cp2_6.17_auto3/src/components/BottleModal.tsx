import React, { useState } from 'react';
import type { Bottle } from '../api';
import { writeBottle } from '../api';

interface BottleModalProps {
  bottle: Bottle | null;
  onClose: () => void;
  onWritten: () => void;
}

const BottleModal: React.FC<BottleModalProps> = ({ bottle, onClose, onWritten }) => {
  const [writeContent, setWriteContent] = useState('');
  const [writeAuthor, setWriteAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!bottle) return null;

  const handleWrite = async () => {
    if (!writeContent.trim()) return;
    setSubmitting(true);
    try {
      await writeBottle(bottle.id, {
        content: writeContent.trim(),
        author: writeAuthor.trim() || '匿名旅人',
      });
      setWriteContent('');
      setWriteAuthor('');
      onWritten();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const recentWrites = bottle.writes.slice(-3);

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
          maxHeight: '90vh',
          overflowY: 'auto',
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '20px',
                height: '28px',
                borderRadius: '4px 4px 6px 6px',
                background: bottle.color,
                border: '1px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
              }}
            />
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#1e293b',
                margin: 0,
              }}
            >
              {bottle.title}
            </h2>
          </div>
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

        <div
          style={{
            marginTop: '16px',
            padding: '14px',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '10px',
            fontSize: '14px',
            lineHeight: 1.7,
            color: '#334155',
          }}
        >
          {bottle.content}
        </div>

        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#94a3b8',
          }}
        >
          <span>来自：{bottle.author || '匿名旅人'}</span>
          <span>漂流里程：{bottle.mileage} 次</span>
        </div>

        {recentWrites.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
              续写接力
            </h3>
            {recentWrites.map((w, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(56, 189, 248, 0.06)',
                  borderRadius: '8px',
                  marginBottom: '6px',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: '#475569',
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
                  {w.author || '匿名旅人'} 续写
                </div>
                {w.content}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
            续写一段
          </div>
          <input
            value={writeAuthor}
            onChange={(e) => setWriteAuthor(e.target.value.slice(0, 20))}
            placeholder="署名（可选）"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              marginBottom: '8px',
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
          <textarea
            value={writeContent}
            onChange={(e) => setWriteContent(e.target.value.slice(0, 200))}
            placeholder="写下你的续写...（限200字）"
            style={{
              width: '100%',
              height: '80px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              lineHeight: 1.5,
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              onClick={handleWrite}
              disabled={submitting || !writeContent.trim()}
              style={{
                width: '160px',
                height: '44px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: submitting || !writeContent.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !writeContent.trim() ? 0.6 : 1,
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
              }}
              onMouseEnter={(e) => {
                if (!submitting && writeContent.trim()) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)';
              }}
            >
              {submitting ? '投递中...' : '再扔回去'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottleModal;
