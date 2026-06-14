import { useState, useRef, useCallback, useEffect } from 'react';
import { DiffLine, Comment, CharDiff } from '../types';

interface DiffViewerProps {
  diffLines: DiffLine[];
  comments: Comment[];
  highlightLineId: string | null;
  onAddComment: (diffLineId: string, position: { x: number; y: number }, version: 'old' | 'new' | 'both') => void;
  onUpdateCommentPosition: (commentId: string, position: { x: number; y: number }) => void;
  onToggleExpand: (commentId: string) => void;
  onResolveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onAddReply: (commentId: string, content: string, author: string) => void;
}

const getLineBackgroundColor = (type: string): string => {
  switch (type) {
    case 'added': return '#d4edda';
    case 'removed': return '#f8d7da';
    case 'modified': return '#fff3cd';
    default: return 'transparent';
  }
};

const getLineIcon = (type: string): string => {
  switch (type) {
    case 'added': return '+';
    case 'removed': return '-';
    case 'modified': return '~';
    default: return '';
  }
};

const getTagColor = (color: string): string => {
  switch (color) {
    case 'red': return '#ef4444';
    case 'green': return '#22c55e';
    case 'blue': 
    default: return '#3b82f6';
  }
};

const renderCharDiffs = (charDiffs: CharDiff[], isNew: boolean) => {
  return charDiffs.map((cd, idx) => {
    if (cd.type === 'unchanged') {
      return <span key={idx}>{cd.value}</span>;
    }
    if ((isNew && cd.type === 'added') || (!isNew && cd.type === 'removed')) {
      return (
        <span
          key={idx}
          style={{
            background: cd.type === 'added' ? '#a6e9a6' : '#f5b3b3',
            textDecoration: cd.type === 'removed' ? 'line-through' : 'none',
            padding: '0 2px',
            borderRadius: '2px'
          }}
        >
          {cd.value}
        </span>
      );
    }
    return null;
  });
};

interface CommentCardProps {
  comment: Comment;
  onUpdatePosition: (id: string, pos: { x: number; y: number }) => void;
  onToggleExpand: (id: string) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onAddReply: (id: string, content: string, author: string) => void;
}

const CommentCard = ({
  comment,
  onUpdatePosition,
  onToggleExpand,
  onResolve,
  onDelete,
  onAddReply
}: CommentCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [replyContent, setReplyContent] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.comment-actions') ||
        (e.target as HTMLElement).closest('.comment-content')) {
      return;
    }
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - comment.position.x,
      y: e.clientY - comment.position.y
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      onUpdatePosition(comment.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, comment.id, onUpdatePosition]);

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    onAddReply(comment.id, replyContent.trim(), replyAuthor.trim() || '匿名用户');
    setReplyContent('');
    setReplyAuthor('');
    setShowReplyInput(false);
  };

  const tagColor = getTagColor(comment.tagColor);

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        left: comment.position.x,
        top: comment.position.y,
        minWidth: '280px',
        maxWidth: '360px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        borderLeft: `3px solid ${tagColor}`,
        zIndex: isDragging ? 1000 : 10,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: comment.resolved ? 0.6 : 1,
        transition: isDragging ? 'none' : 'opacity 0.3s ease-out',
        animation: 'fadeIn 0.3s ease-out'
      }}
      onMouseDown={handleMouseDown}
    >
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: tagColor,
            flexShrink: 0
          }} />
          <strong style={{ fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {comment.author}
          </strong>
        </div>
        <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>
          {new Date(comment.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="comment-content" style={{ padding: '12px', cursor: 'default' }}>
        <p style={{ fontSize: '13px', color: '#1f2937', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {comment.content}
        </p>
      </div>

      <div className="comment-actions" style={{
        padding: '8px 12px',
        borderTop: '1px solid #f3f4f6',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => onToggleExpand(comment.id)}
          style={{
            padding: '4px 8px',
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {comment.expanded ? '▼' : '▶'} 回复 ({comment.replies.length})
        </button>
        <button
          onClick={() => onResolve(comment.id)}
          style={{
            padding: '4px 8px',
            background: 'none',
            border: 'none',
            color: comment.resolved ? '#9ca3af' : '#22c55e',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {comment.resolved ? '↩ 重新打开' : '✓ 标记解决'}
        </button>
        <button
          onClick={() => setShowReplyInput(!showReplyInput)}
          style={{
            padding: '4px 8px',
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          💬 回复
        </button>
        <button
          onClick={() => onDelete(comment.id)}
          style={{
            padding: '4px 8px',
            background: 'none',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '12px',
            marginLeft: 'auto'
          }}
        >
          🗑️
        </button>
      </div>

      {showReplyInput && (
        <div style={{
          padding: '12px',
          borderTop: '1px solid #f3f4f6',
          background: '#f9fafb',
          animation: 'expandHeight 0.2s ease-out'
        }}>
          <input
            type="text"
            value={replyAuthor}
            onChange={(e) => setReplyAuthor(e.target.value)}
            placeholder="您的名字"
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '12px',
              marginBottom: '8px'
            }}
          />
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="输入回复内容..."
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '12px',
              resize: 'vertical',
              minHeight: '60px',
              marginBottom: '8px'
            }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowReplyInput(false)}
              style={{
                padding: '4px 12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              取消
            </button>
            <button
              onClick={handleSubmitReply}
              disabled={!replyContent.trim()}
              style={{
                padding: '4px 12px',
                background: replyContent.trim() ? '#3b82f6' : '#93c5fd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: replyContent.trim() ? 'pointer' : 'not-allowed',
                fontSize: '12px'
              }}
            >
              发送
            </button>
          </div>
        </div>
      )}

      {comment.expanded && comment.replies.length > 0 && (
        <div style={{
          padding: '8px 12px 12px',
          borderTop: '1px solid #f3f4f6',
          animation: 'expandHeight 0.2s ease-out'
        }}>
          {comment.replies.map((reply) => (
            <div key={reply.id} style={{
              padding: '8px',
              marginLeft: '12px',
              borderLeft: '2px solid #e5e7eb',
              marginBottom: '8px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <strong style={{ fontSize: '12px', color: '#374151' }}>{reply.author}</strong>
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                  {new Date(reply.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#4b5563', margin: 0, whiteSpace: 'pre-wrap' }}>
                {reply.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DiffViewer = ({
  diffLines,
  comments,
  highlightLineId,
  onAddComment,
  onUpdateCommentPosition,
  onToggleExpand,
  onResolveComment,
  onDeleteComment,
  onAddReply
}: DiffViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showMobileVertical, setShowMobileVertical] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setShowMobileVertical(window.innerWidth < 768);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const handleLineClick = useCallback((e: React.MouseEvent, diffLine: DiffLine, version: 'old' | 'new' | 'both') => {
    if (diffLine.type === 'unchanged') return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + 20;
    const y = e.clientY - rect.top - 60;

    onAddComment(diffLine.id, { x, y }, version);
  }, [onAddComment]);

  const lineCommentsMap = new Map<string, Comment[]>();
  comments.forEach(c => {
    const existing = lineCommentsMap.get(c.diffLineId) || [];
    lineCommentsMap.set(c.diffLineId, [...existing, c]);
  });

  const renderLineContent = (line: DiffLine, isOld: boolean) => {
    if (line.charDiffs && line.type === 'modified') {
      return renderCharDiffs(line.charDiffs, !isOld);
    }
    return <span>{isOld ? line.oldContent : line.newContent}</span>;
  };

  if (showMobileVertical) {
    return (
      <div ref={containerRef} style={{ position: 'relative', padding: '16px' }}>
        <div style={{ marginBottom: '16px', padding: '8px 12px', background: '#fef3c7', borderRadius: '6px', fontSize: '13px', color: '#92400e' }}>
          <span style={{ background: '#fecaca', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', marginRight: '8px', fontSize: '11px' }}>版本A</span>
          旧版本内容
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
          <tbody>
            {diffLines.map((line) => (
              <tr
                key={line.id}
                id={`line-${line.id}`}
                className={highlightLineId === line.id ? 'highlight-flash' : ''}
                style={{
                  background: line.type === 'removed' ? getLineBackgroundColor('removed') : 
                              line.type === 'modified' ? getLineBackgroundColor('removed') : 'transparent',
                  transition: 'box-shadow 0.3s ease-out',
                  cursor: line.type !== 'unchanged' ? 'pointer' : 'default'
                }}
                onClick={(e) => handleLineClick(e, line, 'old')}
              >
                <td style={{ 
                  padding: '2px 8px', 
                  width: '40px', 
                  textAlign: 'right', 
                  color: '#9ca3af', 
                  fontSize: '12px',
                  borderRight: '1px solid #e5e7eb',
                  userSelect: 'none'
                }}>
                  {line.oldLineNumber || ''}
                </td>
                <td style={{ 
                  padding: '2px 4px', 
                  width: '20px', 
                  color: line.type === 'removed' ? '#dc2626' : line.type === 'modified' ? '#d97706' : '#9ca3af',
                  fontWeight: 600,
                  userSelect: 'none'
                }}>
                  {line.type === 'modified' || line.type === 'removed' ? getLineIcon(line.type) : ''}
                </td>
                <td style={{ 
                  padding: '2px 8px', 
                  fontFamily: 'monospace', 
                  fontSize: '13px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  position: 'relative'
                }}>
                  {line.type === 'removed' || line.type === 'modified' 
                    ? renderLineContent(line, true) 
                    : line.oldContent}
                  {lineCommentsMap.get(line.id) && lineCommentsMap.get(line.id)!.length > 0 && (
                    <span style={{
                      position: 'absolute',
                      right: '8px',
                      top: '2px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#3b82f6',
                      color: 'white',
                      fontSize: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {lineCommentsMap.get(line.id)!.length}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginBottom: '16px', padding: '8px 12px', background: '#d1fae5', borderRadius: '6px', fontSize: '13px', color: '#065f46' }}>
          <span style={{ background: '#bbf7d0', color: '#166534', padding: '2px 8px', borderRadius: '4px', marginRight: '8px', fontSize: '11px' }}>版本B</span>
          新版本内容
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {diffLines.map((line) => (
              <tr
                key={`new-${line.id}`}
                style={{
                  background: line.type === 'added' ? getLineBackgroundColor('added') : 
                              line.type === 'modified' ? getLineBackgroundColor('added') : 'transparent',
                  transition: 'box-shadow 0.3s ease-out',
                  cursor: line.type !== 'unchanged' ? 'pointer' : 'default'
                }}
                onClick={(e) => handleLineClick(e, line, 'new')}
              >
                <td style={{ 
                  padding: '2px 8px', 
                  width: '40px', 
                  textAlign: 'right', 
                  color: '#9ca3af', 
                  fontSize: '12px',
                  borderRight: '1px solid #e5e7eb',
                  userSelect: 'none'
                }}>
                  {line.newLineNumber || ''}
                </td>
                <td style={{ 
                  padding: '2px 4px', 
                  width: '20px', 
                  color: line.type === 'added' ? '#16a34a' : line.type === 'modified' ? '#d97706' : '#9ca3af',
                  fontWeight: 600,
                  userSelect: 'none'
                }}>
                  {line.type === 'modified' || line.type === 'added' ? getLineIcon(line.type) : ''}
                </td>
                <td style={{ 
                  padding: '2px 8px', 
                  fontFamily: 'monospace', 
                  fontSize: '13px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  position: 'relative'
                }}>
                  {line.type === 'added' || line.type === 'modified' 
                    ? renderLineContent(line, false) 
                    : line.newContent}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {comments.map(comment => (
          <CommentCard
            key={comment.id}
            comment={comment}
            onUpdatePosition={onUpdateCommentPosition}
            onToggleExpand={onToggleExpand}
            onResolve={onResolveComment}
            onDelete={onDeleteComment}
            onAddReply={onAddReply}
          />
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', padding: '0' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        background: 'white',
        borderBottom: '2px solid #e5e7eb',
        display: 'flex'
      }}>
        <div style={{
          flex: '0 0 50%',
          padding: '10px 12px',
          fontWeight: 600,
          fontSize: '13px',
          color: '#dc2626',
          background: '#fef2f2',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            padding: '2px 8px',
            background: '#fecaca',
            borderRadius: '4px',
            fontSize: '11px'
          }}>版本A</span>
          旧版本
        </div>
        <div style={{
          flex: '0 0 50%',
          padding: '10px 12px',
          fontWeight: 600,
          fontSize: '13px',
          color: '#16a34a',
          background: '#f0fdf4',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            padding: '2px 8px',
            background: '#bbf7d0',
            borderRadius: '4px',
            fontSize: '11px'
          }}>版本B</span>
          新版本
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {diffLines.map((line) => (
            <tr
              key={line.id}
              id={`line-${line.id}`}
              className={highlightLineId === line.id ? 'highlight-flash' : ''}
              style={{
                background: getLineBackgroundColor(line.type),
                transition: 'box-shadow 0.3s ease-out',
                cursor: line.type !== 'unchanged' ? 'pointer' : 'default'
              }}
              onClick={(e) => handleLineClick(e, line, 'both')}
            >
              <td style={{ 
                padding: '2px 8px', 
                width: '50px', 
                textAlign: 'right', 
                color: '#9ca3af', 
                fontSize: '12px',
                borderRight: '1px solid #e5e7eb',
                userSelect: 'none',
                verticalAlign: 'top'
              }}>
                {line.oldLineNumber || ''}
              </td>
              <td style={{ 
                padding: '2px 4px', 
                width: '24px', 
                color: line.type === 'added' ? '#16a34a' : line.type === 'removed' ? '#dc2626' : line.type === 'modified' ? '#d97706' : '#9ca3af',
                fontWeight: 600,
                userSelect: 'none',
                verticalAlign: 'top',
                fontSize: '14px'
              }}>
                {getLineIcon(line.type)}
              </td>
              <td style={{ 
                padding: '2px 8px', 
                fontFamily: 'monospace', 
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                borderRight: '2px solid #e5e7eb',
                verticalAlign: 'top',
                flex: '0 0 calc(50% - 74px)',
                width: 'calc(50% - 74px)',
                position: 'relative'
              }}>
                {renderLineContent(line, true)}
                {line.type !== 'unchanged' && lineCommentsMap.get(line.id) && lineCommentsMap.get(line.id)!.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    right: '8px',
                    top: '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    color: 'white',
                    fontSize: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {lineCommentsMap.get(line.id)!.length}
                  </span>
                )}
              </td>
              <td style={{ 
                padding: '2px 8px', 
                width: '50px', 
                textAlign: 'right', 
                color: '#9ca3af', 
                fontSize: '12px',
                borderRight: '1px solid #e5e7eb',
                userSelect: 'none',
                verticalAlign: 'top'
              }}>
                {line.newLineNumber || ''}
              </td>
              <td style={{ 
                padding: '2px 8px', 
                fontFamily: 'monospace', 
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                verticalAlign: 'top',
                flex: '0 0 calc(50% - 50px)',
                width: 'calc(50% - 50px)'
              }}>
                {renderLineContent(line, false)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {comments.map(comment => (
        <CommentCard
          key={comment.id}
          comment={comment}
          onUpdatePosition={onUpdateCommentPosition}
          onToggleExpand={onToggleExpand}
          onResolve={onResolveComment}
          onDelete={onDeleteComment}
          onAddReply={onAddReply}
        />
      ))}
    </div>
  );
};

export default DiffViewer;
