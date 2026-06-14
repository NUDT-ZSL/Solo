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
    case 'removed': return '−';
    case 'modified': return '~';
    default: return '·';
  }
};

const getLineIconColor = (type: string): string => {
  switch (type) {
    case 'added': return '#16a34a';
    case 'removed': return '#dc2626';
    case 'modified': return '#d97706';
    default: return '#9ca3af';
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

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
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
  containerRef: React.RefObject<HTMLDivElement>;
  onUpdatePosition: (id: string, pos: { x: number; y: number }) => void;
  onToggleExpand: (id: string) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onAddReply: (id: string, content: string, author: string) => void;
}

const CommentCard = ({
  comment,
  containerRef,
  onUpdatePosition,
  onToggleExpand,
  onResolve,
  onDelete,
  onAddReply
}: CommentCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [replyContent, setReplyContent] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStartMouse({ x: e.clientX, y: e.clientY });
    setDragStartPos({ x: comment.position.x, y: comment.position.y });
  }, [comment.position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const dx = e.clientX - dragStartMouse.x;
      const dy = e.clientY - dragStartMouse.y;

      let newX = dragStartPos.x + dx;
      let newY = dragStartPos.y + dy;

      const container = containerRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const cardWidth = cardRef.current?.offsetWidth || 300;
        const cardHeight = cardRef.current?.offsetHeight || 150;

        newX = Math.max(0, Math.min(newX, containerRect.width - cardWidth - 10));
        newY = Math.max(0, Math.min(newY, container.scrollHeight - cardHeight - 10));
      }

      onUpdatePosition(comment.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartMouse, dragStartPos, comment.id, containerRef, onUpdatePosition]);

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    onAddReply(comment.id, replyContent.trim(), replyAuthor.trim() || '匿名用户');
    setReplyContent('');
    setReplyAuthor('');
    setShowReplyInput(false);
  };

  const tagColor = getTagColor(comment.tagColor);
  const borderColor = comment.resolved ? '#9ca3af' : tagColor;

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
        boxShadow: isDragging
          ? '0 12px 40px rgba(0, 0, 0, 0.25)'
          : '0 4px 20px rgba(0, 0, 0, 0.15)',
        borderLeft: `3px solid ${borderColor}`,
        zIndex: isDragging ? 9999 : 50,
        opacity: comment.resolved ? 0.55 : 1,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging
          ? 'box-shadow 0.15s ease-out, transform 0.15s ease-out'
          : 'box-shadow 0.3s ease-out, opacity 0.3s ease-out, transform 0.3s ease-out',
        animation: 'fadeIn 0.3s ease-out',
        userSelect: isDragging ? 'none' : 'auto'
      }}
    >
      <div
        onMouseDown={handleDragStart}
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${comment.resolved ? '#e5e7eb' : '#f3f4f6'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          cursor: isDragging ? 'grabbing' : 'grab',
          background: comment.resolved ? '#f9fafb' : '#fafafa',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: borderColor,
              flexShrink: 0
            }}
          />
          <strong style={{
            fontSize: '13px',
            color: comment.resolved ? '#9ca3af' : '#374151',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {comment.author}
          </strong>
          {comment.resolved && (
            <span style={{
              fontSize: '10px',
              padding: '1px 6px',
              background: '#e5e7eb',
              color: '#6b7280',
              borderRadius: '10px',
              flexShrink: 0
            }}>已解决</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '11px',
            color: '#9ca3af',
            flexShrink: 0
          }}>
            {formatTime(comment.timestamp)}
          </span>
          <span style={{
            fontSize: '14px',
            cursor: isDragging ? 'grabbing' : 'grab',
            color: '#9ca3af',
            flexShrink: 0,
            userSelect: 'none'
          }}>⋮⋮</span>
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{ padding: '12px', cursor: 'default' }}>
        <p style={{
          fontSize: '13px',
          color: comment.resolved ? '#9ca3af' : '#1f2937',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.5
        }}>
          {comment.content}
        </p>
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{
        padding: '8px 12px',
        borderTop: '1px solid #f3f4f6',
        display: 'flex',
        gap: '4px',
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
            gap: '4px',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          {comment.expanded ? '▼' : '▶'} {comment.replies.length}
        </button>
        <button
          onClick={() => onResolve(comment.id)}
          style={{
            padding: '4px 8px',
            background: 'none',
            border: 'none',
            color: comment.resolved ? '#9ca3af' : '#22c55e',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          {comment.resolved ? '↩ 打开' : '✓ 解决'}
        </button>
        <button
          onClick={() => setShowReplyInput(!showReplyInput)}
          style={{
            padding: '4px 8px',
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
            marginLeft: 'auto',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          🗑️
        </button>
      </div>

      {showReplyInput && (
        <div onClick={(e) => e.stopPropagation()} style={{
          padding: '12px',
          borderTop: '1px solid #f3f4f6',
          background: '#f9fafb',
          animation: 'expandHeight 0.2s ease-out',
          overflow: 'hidden'
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
              marginBottom: '8px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
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
              marginBottom: '8px',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowReplyInput(false)}
              style={{
                padding: '5px 14px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                color: '#374151',
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
                padding: '5px 14px',
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
        <div onClick={(e) => e.stopPropagation()} style={{
          padding: '8px 12px 12px',
          borderTop: '1px solid #f3f4f6',
          animation: 'expandHeight 0.2s ease-out',
          overflow: 'hidden'
        }}>
          {comment.replies.map((reply) => (
            <div key={reply.id} style={{
              padding: '8px',
              marginLeft: '8px',
              borderLeft: '2px solid #e5e7eb',
              marginBottom: '6px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <strong style={{ fontSize: '12px', color: '#374151' }}>{reply.author}</strong>
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                  {formatTime(reply.timestamp)}
                </span>
              </div>
              <p style={{
                fontSize: '12px',
                color: '#4b5563',
                margin: 0,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5
              }}>
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
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      const width = window.innerWidth;
      setIsSmallScreen(width < 768);
      setShowMobileVertical(width < 768);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const handleLineClick = useCallback((e: React.MouseEvent, diffLine: DiffLine, version: 'old' | 'new' | 'both') => {
    if (diffLine.type === 'unchanged') return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scrollTop = containerRef.current?.scrollTop || 0;
    const scrollLeft = containerRef.current?.scrollLeft || 0;

    let x = e.clientX - rect.left + scrollLeft + 15;
    let y = e.clientY - rect.top + scrollTop - 30;

    x = Math.max(10, Math.min(x, rect.width - 310));
    y = Math.max(10, y);

    onAddComment(diffLine.id, { x, y }, version);
  }, [onAddComment]);

  const lineCommentsMap = useCallback(() => {
    const map = new Map<string, Comment[]>();
    comments.forEach(c => {
      const existing = map.get(c.diffLineId) || [];
      map.set(c.diffLineId, [...existing, c]);
    });
    return map;
  }, [comments])();

  const renderLineContent = (line: DiffLine, isOld: boolean) => {
    if (line.charDiffs && line.type === 'modified') {
      return renderCharDiffs(line.charDiffs, !isOld);
    }
    const content = isOld ? line.oldContent : line.newContent;
    return <span>{content || '\u00A0'}</span>;
  };

  const CommentBadge = ({ count }: { count: number }) => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      background: '#3b82f6',
      color: 'white',
      fontSize: '10px',
      fontWeight: 600,
      flexShrink: 0,
      boxShadow: '0 1px 3px rgba(59, 130, 246, 0.4)'
    }}>
      {count > 9 ? '9+' : count}
    </span>
  );

  const getIconCell = (line: DiffLine, forVersion: 'old' | 'new' | 'both' = 'both') => {
    let iconType = line.type;
    if (forVersion === 'old' && line.type === 'modified') iconType = 'removed';
    if (forVersion === 'new' && line.type === 'modified') iconType = 'added';
    if (forVersion === 'old' && line.type === 'added') return { icon: '', color: 'transparent' };
    if (forVersion === 'new' && line.type === 'removed') return { icon: '', color: 'transparent' };

    return { icon: getLineIcon(iconType), color: getLineIconColor(iconType) };
  };

  if (showMobileVertical || isSmallScreen) {
    return (
      <div
        ref={containerRef}
        className="diff-viewer-mobile"
        style={{ position: 'relative', padding: '12px', minHeight: '100%' }}
      >
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          padding: '10px 12px',
          background: '#fef3c7',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#92400e',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600
        }}>
          <span style={{
            padding: '2px 10px',
            background: '#fecaca',
            color: '#dc2626',
            borderRadius: '4px',
            fontSize: '11px'
          }}>版本A</span>
          <span>旧版本内容</span>
        </div>

        <div style={{
          overflowX: 'auto',
          marginBottom: '32px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <tbody>
              {diffLines.map((line) => {
                const iconInfo = getIconCell(line, 'old');
                const lineComments = lineCommentsMap.get(line.id) || [];
                const showBg = line.type === 'removed' || line.type === 'modified';

                return (
                  <tr
                    key={line.id}
                    id={`line-old-${line.id}`}
                    className={highlightLineId === line.id ? 'highlight-flash' : ''}
                    style={{
                      background: showBg ? getLineBackgroundColor('removed') : 'transparent',
                      transition: 'box-shadow 0.3s ease-out',
                      cursor: line.type !== 'unchanged' ? 'pointer' : 'default'
                    }}
                    onClick={(e) => handleLineClick(e, line, 'old')}
                  >
                    <td style={{
                      padding: '3px 6px',
                      width: '32px',
                      textAlign: 'right',
                      color: '#9ca3af',
                      fontSize: '11px',
                      borderRight: '1px solid #f3f4f6',
                      userSelect: 'none',
                      verticalAlign: 'top'
                    }}>
                      {line.oldLineNumber || ''}
                    </td>
                    <td style={{
                      padding: '3px 2px',
                      width: '22px',
                      textAlign: 'center',
                      color: iconInfo.color,
                      fontWeight: 700,
                      fontSize: '14px',
                      userSelect: 'none',
                      verticalAlign: 'top',
                      background: line.type !== 'unchanged' ? 'rgba(255,255,255,0.5)' : 'transparent'
                    }}>
                      {iconInfo.icon}
                    </td>
                    <td style={{
                      padding: '3px 8px',
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: '13px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      verticalAlign: 'top',
                      position: 'relative',
                      lineHeight: 1.6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {renderLineContent(line, true)}
                        </div>
                        {line.type !== 'unchanged' && lineComments.length > 0 && (
                          <div style={{ marginTop: '2px', flexShrink: 0 }}>
                            <CommentBadge count={lineComments.length} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          padding: '10px 12px',
          background: '#d1fae5',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#065f46',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600
        }}>
          <span style={{
            padding: '2px 10px',
            background: '#bbf7d0',
            color: '#166534',
            borderRadius: '4px',
            fontSize: '11px'
          }}>版本B</span>
          <span>新版本内容</span>
        </div>

        <div style={{
          overflowX: 'auto',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <tbody>
              {diffLines.map((line) => {
                const iconInfo = getIconCell(line, 'new');
                const lineComments = lineCommentsMap.get(line.id) || [];
                const showBg = line.type === 'added' || line.type === 'modified';

                return (
                  <tr
                    key={`new-${line.id}`}
                    id={`line-new-${line.id}`}
                    className={highlightLineId === line.id ? 'highlight-flash' : ''}
                    style={{
                      background: showBg ? getLineBackgroundColor('added') : 'transparent',
                      transition: 'box-shadow 0.3s ease-out',
                      cursor: line.type !== 'unchanged' ? 'pointer' : 'default'
                    }}
                    onClick={(e) => handleLineClick(e, line, 'new')}
                  >
                    <td style={{
                      padding: '3px 6px',
                      width: '32px',
                      textAlign: 'right',
                      color: '#9ca3af',
                      fontSize: '11px',
                      borderRight: '1px solid #f3f4f6',
                      userSelect: 'none',
                      verticalAlign: 'top'
                    }}>
                      {line.newLineNumber || ''}
                    </td>
                    <td style={{
                      padding: '3px 2px',
                      width: '22px',
                      textAlign: 'center',
                      color: iconInfo.color,
                      fontWeight: 700,
                      fontSize: '14px',
                      userSelect: 'none',
                      verticalAlign: 'top',
                      background: line.type !== 'unchanged' ? 'rgba(255,255,255,0.5)' : 'transparent'
                    }}>
                      {iconInfo.icon}
                    </td>
                    <td style={{
                      padding: '3px 8px',
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: '13px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      verticalAlign: 'top',
                      position: 'relative',
                      lineHeight: 1.6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {renderLineContent(line, false)}
                        </div>
                        {line.type !== 'unchanged' && lineComments.length > 0 && (
                          <div style={{ marginTop: '2px', flexShrink: 0 }}>
                            <CommentBadge count={lineComments.length} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {comments.map(comment => (
          <CommentCard
            key={comment.id}
            comment={comment}
            containerRef={containerRef}
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
    <div
      ref={containerRef}
      className="diff-viewer-desktop"
      style={{ position: 'relative', padding: '0', minHeight: '100%', background: 'white' }}
    >
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
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

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '48px' }} />
            <col style={{ width: '24px' }} />
            <col style={{ width: 'calc(50% - 72px)' }} />
            <col style={{ width: '48px' }} />
            <col style={{ width: '24px' }} />
            <col style={{ width: 'calc(50% - 72px)' }} />
          </colgroup>
          <tbody>
            {diffLines.map((line) => {
              const iconInfo = getIconCell(line);
              const lineComments = lineCommentsMap.get(line.id) || [];
              const lineBg = getLineBackgroundColor(line.type);
              const hasChanges = line.type !== 'unchanged';

              return (
                <tr
                  key={line.id}
                  id={`line-${line.id}`}
                  className={highlightLineId === line.id ? 'highlight-flash' : ''}
                  style={{
                    background: lineBg,
                    transition: 'box-shadow 0.3s ease-out',
                    cursor: hasChanges ? 'pointer' : 'default'
                  }}
                  onClick={(e) => handleLineClick(e, line, 'both')}
                  onMouseEnter={(e) => {
                    if (hasChanges) {
                      e.currentTarget.style.outline = '1px solid rgba(59, 130, 246, 0.2)';
                      e.currentTarget.style.outlineOffset = '-1px';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                >
                  <td style={{
                    padding: '3px 6px',
                    textAlign: 'right',
                    color: '#9ca3af',
                    fontSize: '11px',
                    borderRight: '1px solid #f3f4f6',
                    userSelect: 'none',
                    verticalAlign: 'top'
                  }}>
                    {line.oldLineNumber || ''}
                  </td>
                  <td style={{
                    padding: '3px 2px',
                    textAlign: 'center',
                    color: iconInfo.color,
                    fontWeight: 700,
                    fontSize: '15px',
                    userSelect: 'none',
                    verticalAlign: 'top',
                    background: hasChanges ? 'rgba(255,255,255,0.35)' : 'transparent',
                    borderRight: '1px solid #e5e7eb',
                    width: '24px'
                  }}>
                    {iconInfo.icon}
                  </td>
                  <td style={{
                    padding: '3px 8px',
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '13px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    borderRight: '2px solid #e5e7eb',
                    verticalAlign: 'top',
                    lineHeight: 1.6
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renderLineContent(line, true)}
                      </div>
                    </div>
                  </td>
                  <td style={{
                    padding: '3px 6px',
                    textAlign: 'right',
                    color: '#9ca3af',
                    fontSize: '11px',
                    borderRight: '1px solid #f3f4f6',
                    userSelect: 'none',
                    verticalAlign: 'top'
                  }}>
                    {line.newLineNumber || ''}
                  </td>
                  <td style={{
                    padding: '3px 2px',
                    textAlign: 'center',
                    color: 'transparent',
                    fontSize: '15px',
                    userSelect: 'none',
                    verticalAlign: 'top',
                    width: '24px'
                  }}>
                    {' '}
                  </td>
                  <td style={{
                    padding: '3px 8px',
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '13px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    verticalAlign: 'top',
                    lineHeight: 1.6,
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renderLineContent(line, false)}
                      </div>
                      {hasChanges && lineComments.length > 0 && (
                        <div style={{ marginTop: '2px', flexShrink: 0 }}>
                          <CommentBadge count={lineComments.length} />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {comments.map(comment => (
        <CommentCard
          key={comment.id}
          comment={comment}
          containerRef={containerRef}
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
