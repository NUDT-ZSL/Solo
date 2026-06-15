import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { CodeSnippet, Comment } from '../types';
import { LANGUAGE_COLORS } from '../types';
import { fetchComments, addComment, updateSnippetStatus } from '../utils/http';

interface CodeReviewPanelProps {
  snippet: CodeSnippet;
  onSnippetUpdate: (snippet: CodeSnippet) => void;
}

export default function CodeReviewPanel({ snippet, onSnippetUpdate }: CodeReviewPanelProps) {
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(snippet.comments);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [sending, setSending] = useState(false);
  const commentsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setComments(snippet.comments);
    setCommentPage(1);
    setSelectedLine(null);
  }, [snippet.id, snippet.comments]);

  const loadMoreComments = useCallback(async () => {
    const nextPage = commentPage + 1;
    try {
      const res = await fetchComments(snippet.id, nextPage, 10);
      if (res.success) {
        setComments((prev) => [...prev, ...res.data.items]);
        setCommentPage(nextPage);
        setHasMoreComments(res.data.hasMore);
      }
    } catch (error) {
      console.error('Failed to load more comments:', error);
    }
  }, [commentPage, snippet.id]);

  useEffect(() => {
    const el = commentsListRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50 && hasMoreComments) {
        loadMoreComments();
      }
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasMoreComments, loadMoreComments]);

  useEffect(() => {
    setHasMoreComments(comments.length < snippet.comments.length);
  }, [comments.length, snippet.comments.length]);

  const handleSendComment = async () => {
    if (!commentText.trim() || sending) return;
    setSending(true);
    try {
      const res = await addComment({
        snippetId: snippet.id,
        content: commentText.trim(),
        lineNumber: selectedLine ?? undefined,
        authorId: 'u1',
      });
      if (res.success) {
        setComments((prev) => [res.data, ...prev]);
        setCommentText('');
        setSelectedLine(null);
      }
    } catch (error) {
      console.error('Failed to send comment:', error);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: CodeSnippet['status']) => {
    try {
      const res = await updateSnippetStatus(snippet.id, status);
      if (res.success) {
        onSnippetUpdate(res.data);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const codeLines = snippet.code.split('\n');
  const langColor = LANGUAGE_COLORS[snippet.language] || '#667eea';
  const statusLabel: Record<string, string> = {
    pending: '待审',
    approved: '已通过',
    changes_requested: '需修改',
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    return d.toLocaleDateString('zh-CN');
  };

  return (
    <div className="detail-layout">
      <div className="detail-code-section">
        <div className="detail-code-header">
          <span className="detail-code-title">{snippet.title}</span>
          <span className="detail-code-lang" style={{ backgroundColor: langColor, color: '#fff' }}>
            {snippet.language}
          </span>
        </div>
        <div className="detail-code-body">
          {codeLines.map((line, i) => (
            <div
              key={i}
              className={`detail-code-line ${selectedLine === i + 1 ? 'selected' : ''}`}
              onClick={() => setSelectedLine(selectedLine === i + 1 ? null : i + 1)}
            >
              <span className="detail-line-number">{i + 1}</span>
              <span className="detail-line-content">{line}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-review-section">
        <div className="review-header">
          <div className="review-title">评审讨论</div>
          <div className="review-status-row">
            <span className="review-status-label">状态：</span>
            {(['pending', 'approved', 'changes_requested'] as const).map((s) => (
              <button
                key={s}
                className={`review-status-btn ${
                  snippet.status === s
                    ? s === 'approved'
                      ? 'active-approved'
                      : s === 'pending'
                        ? 'active-pending'
                        : 'active-changes'
                    : ''
                }`}
                onClick={() => handleStatusChange(s)}
              >
                {statusLabel[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="review-comments-list" ref={commentsListRef}>
          {comments.map((comment) => (
            <div className="review-comment" key={comment.id}>
              <div className="review-comment-header">
                <div className="review-comment-avatar">
                  {comment.author.name.charAt(0)}
                </div>
                <span className="review-comment-author">{comment.author.name}</span>
                <span className="review-comment-time">{formatTime(comment.createdAt)}</span>
                {comment.lineNumber && (
                  <span className="review-comment-line">L{comment.lineNumber}</span>
                )}
              </div>
              <div className="review-comment-body">{comment.content}</div>
            </div>
          ))}
          {hasMoreComments && (
            <div className="review-load-more">
              <button className="review-load-more-btn" onClick={loadMoreComments}>
                加载更多评论...
              </button>
            </div>
          )}
        </div>

        <div className="review-input-area">
          <input
            className="review-input"
            type="text"
            placeholder={
              selectedLine
                ? `评论第 ${selectedLine} 行...`
                : '输入评论...'
            }
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendComment();
              }
            }}
          />
          <button
            className="review-send-btn"
            onClick={handleSendComment}
            disabled={!commentText.trim() || sending}
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
