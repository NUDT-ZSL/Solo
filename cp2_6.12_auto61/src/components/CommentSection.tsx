import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { getComments, createComment, type Comment } from '../api/snippets';

interface Props {
  snippetId: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

const markdownStyles = `
  .md-content p { margin: 0; }
  .md-content code {
    background: #45475a;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    color: #f9e2af;
  }
  .md-content pre {
    background: #313244;
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 8px 0;
  }
  .md-content pre code {
    background: transparent;
    padding: 0;
    color: #cdd6f4;
  }
`;

export default function CommentSection({ snippetId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getComments(snippetId).then(setComments).catch(console.error);
  }, [snippetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.length > 200 || submitting) return;
    setSubmitting(true);
    try {
      const comment = await createComment(snippetId, {
        content: content.trim(),
        username: username.trim() || undefined,
      });
      setComments((prev) => [comment, ...prev]);
      setContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 32 }}>
      <style>{markdownStyles}</style>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#cdd6f4' }}>评论</h3>

      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="昵称（默认匿名）"
            style={{
              padding: '10px 14px',
              background: '#1e1e2e',
              border: '1px solid #45475a',
              borderRadius: 8,
              color: '#cdd6f4',
              fontSize: 14,
              outline: 'none',
              width: 180,
            }}
          />
          <span style={{ fontSize: 12, color: '#6c7086', alignSelf: 'center' }}>
            {content.length}/200
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 200))}
            placeholder="写下你的评论... 支持Markdown代码块"
            rows={3}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: '#1e1e2e',
              border: '1px solid #45475a',
              borderRadius: 8,
              color: '#cdd6f4',
              fontSize: 14,
              lineHeight: 1.5,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            style={{
              padding: '10px 20px',
              background: '#89b4fa',
              border: 'none',
              borderRadius: 8,
              color: '#1e1e2e',
              fontSize: 14,
              fontWeight: 600,
              cursor: content.trim() && !submitting ? 'pointer' : 'not-allowed',
              opacity: content.trim() && !submitting ? 1 : 0.5,
              alignSelf: 'flex-end',
            }}
          >
            发送
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AnimatePresence>
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                background: '#282840',
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#89b4fa' }}>{comment.username}</span>
                <span style={{ fontSize: 12, color: '#6c7086' }}>{relativeTime(comment.created_at)}</span>
              </div>
              <div className="md-content" style={{ fontSize: 14, color: '#bac2de', lineHeight: 1.6 }}>
                <ReactMarkdown>{comment.content}</ReactMarkdown>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {comments.length === 0 && (
          <p style={{ textAlign: 'center', color: '#6c7086', fontSize: 14, padding: 20 }}>暂无评论，来说点什么吧</p>
        )}
      </div>
    </div>
  );
}
