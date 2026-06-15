import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      setReplies(
        data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={containerStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#2a2a3e' }}>
          💬 回复 ({replies.length})
        </span>
        {!showInput && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowInput(true)}
            style={replyBtnStyle}
          >
            回复
          </motion.button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showInput && (
          <motion.div
            key="reply-input"
            initial={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 0, marginBottom: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26, duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value.slice(0, 100))}
              placeholder="写下你的回复（最多100字）"
              style={textareaStyle}
              maxLength={100}
              autoFocus
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: newReply.length >= 90 ? '#ff4757' : '#999',
                  fontWeight: newReply.length >= 90 ? 600 : 400,
                }}
              >
                {newReply.length}/100
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setShowInput(false);
                    setNewReply('');
                  }}
                  style={cancelMiniBtnStyle}
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={submitReply}
                  disabled={submitting || !newReply.trim()}
                  style={{
                    ...submitMiniBtnStyle,
                    opacity: submitting || !newReply.trim() ? 0.55 : 1,
                    cursor: submitting || !newReply.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? '发送中…' : '发送'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div
          style={{
            fontSize: 13,
            color: '#999',
            textAlign: 'center',
            padding: 14,
          }}
        >
          加载中...
        </div>
      ) : replies.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: '#999',
            textAlign: 'center',
            padding: 16,
            backgroundColor: '#fafafc',
            borderRadius: 8,
            border: '1px dashed #e5e5ed',
          }}
        >
          暂无回复，来做第一个留言的人吧 ✨
        </div>
      ) : (
        <div
          style={{
            maxHeight: 260,
            overflowY: 'auto',
            borderRadius: 10,
            backgroundColor: '#fafafc',
            padding: '4px 10px',
            border: '1px solid #f0f0f4',
          }}
        >
          <AnimatePresence initial={false}>
            {replies.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 340,
                  damping: 28,
                  delay: idx * 0.03,
                }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '10px 4px',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      minHeight: 22,
                      backgroundColor: '#6366f1',
                      borderRadius: 4,
                      flexShrink: 0,
                      marginTop: 2,
                      boxShadow: '0 0 0 1px rgba(99,102,241,0.15) inset',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#2a2a3e',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {r.content}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#b0b0c0',
                        marginTop: 5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>🕒</span>
                      {formatTime(r.created_at)}
                    </div>
                  </div>
                </div>
                {idx < replies.length - 1 && (
                  <div
                    style={{
                      height: 1,
                      backgroundColor: '#e9e9ef',
                      marginLeft: 14,
                      marginRight: 4,
                    }}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  marginTop: 16,
  paddingTop: 14,
  borderTop: '1px solid #efeff5',
};

const replyBtnStyle: React.CSSProperties = {
  padding: '7px 16px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: '#6366f1',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 64,
  padding: 10,
  fontSize: 13,
  border: '1.5px solid #e0e0e8',
  borderRadius: 10,
  resize: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  lineHeight: 1.5,
  outline: 'none',
  backgroundColor: '#fff',
};

const cancelMiniBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 8,
  border: '1px solid #e0e0e8',
  backgroundColor: '#fff',
  color: '#666',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 500,
};

const submitMiniBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: '#6366f1',
  color: '#fff',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 600,
  boxShadow: '0 2px 6px rgba(99,102,241,0.25)',
};

export default ReplyPanel;
