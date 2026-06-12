import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Reply, replyApi } from '../services/api';

interface ReplyPanelProps {
  capsuleId: number;
}

const ReplyPanel: React.FC<ReplyPanelProps> = ({ capsuleId }) => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadReplies = async () => {
    setLoading(true);
    try {
      const data = await replyApi.getByCapsuleId(capsuleId);
      setReplies(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (e) {
      console.error('Failed to load replies:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReplies();
  }, [capsuleId]);

  const submitReply = async () => {
    if (!newReply.trim()) return;
    setSubmitting(true);
    try {
      await replyApi.create(capsuleId, newReply.trim());
      setNewReply('');
      setShowInput(false);
      await loadReplies();
    } catch (e) {
      console.error(e);
      alert('回复失败');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
          回复 ({replies.length})
        </span>
        {!showInput && (
          <button onClick={() => setShowInput(true)} style={replyBtnStyle}>
            回复
          </button>
        )}
      </div>

      {showInput && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ marginBottom: 12 }}
        >
          <textarea
            value={newReply}
            onChange={(e) => setNewReply(e.target.value.slice(0, 100))}
            placeholder="写下你的回复（最多100字）"
            style={textareaStyle}
            maxLength={100}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <span style={{ fontSize: 12, color: '#999' }}>{newReply.length}/100</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowInput(false); setNewReply(''); }} style={cancelMiniBtnStyle}>
                取消
              </button>
              <button onClick={submitReply} disabled={submitting || !newReply.trim()} style={submitMiniBtnStyle}>
                {submitting ? '发送中' : '发送'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: 12 }}>加载中...</div>
      ) : replies.length === 0 ? (
        <div style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: 12 }}>暂无回复，来做第一个留言的人吧</div>
      ) : (
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {replies.map((r, idx) => (
            <React.Fragment key={r.id}>
              <div style={replyItemStyle}>
                <div style={replyBarStyle} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.content}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{formatTime(r.created_at)}</div>
                </div>
              </div>
              {idx < replies.length - 1 && <div style={dividerStyle} />}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  marginTop: 14,
  paddingTop: 14,
  borderTop: '1px solid #eee',
};

const replyBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: 'none',
  backgroundColor: '#3742fa',
  color: '#fff',
  fontSize: 13,
  cursor: 'pointer',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 60,
  padding: 8,
  fontSize: 13,
  border: '1px solid #ddd',
  borderRadius: 6,
  resize: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const cancelMiniBtnStyle: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: 6,
  border: '1px solid #ddd',
  backgroundColor: '#fff',
  color: '#666',
  fontSize: 12,
  cursor: 'pointer',
};

const submitMiniBtnStyle: React.CSSProperties = {
  padding: '5px 14px',
  borderRadius: 6,
  border: 'none',
  backgroundColor: '#3742fa',
  color: '#fff',
  fontSize: 12,
  cursor: 'pointer',
};

const replyItemStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  padding: '8px 0',
};

const replyBarStyle: React.CSSProperties = {
  width: 3,
  minHeight: 20,
  backgroundColor: '#5c6bc0',
  borderRadius: 2,
  flexShrink: 0,
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  backgroundColor: '#f0f0f0',
};

export default ReplyPanel;
