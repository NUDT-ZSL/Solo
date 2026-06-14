import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Comment, FilterStatus, FilterVersion } from '../types';

interface CommentPanelProps {
  comments: Comment[];
  filterStatus: FilterStatus;
  filterVersion: FilterVersion;
  onFilterStatusChange: (status: FilterStatus) => void;
  onFilterVersionChange: (version: FilterVersion) => void;
  onJumpToComment: (comment: Comment) => void;
  onResolveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
}

const VIRTUAL_THRESHOLD = 50;
const ITEM_HEIGHT = 120;
const BUFFER_ITEMS = 5;

const getTagColor = (color: string): string => {
  switch (color) {
    case 'red': return '#ef4444';
    case 'green': return '#22c55e';
    case 'blue':
    default: return '#3b82f6';
  }
};

const CommentItem = ({
  comment,
  onJump,
  onResolve,
  onDelete
}: {
  comment: Comment;
  onJump: () => void;
  onResolve: () => void;
  onDelete: () => void;
}) => {
  const tagColor = getTagColor(comment.tagColor);
  
  return (
    <div
      onClick={onJump}
      style={{
        padding: '12px',
        marginBottom: '8px',
        background: 'white',
        borderRadius: '6px',
        borderLeft: `3px solid ${tagColor}`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        cursor: 'pointer',
        opacity: comment.resolved ? 0.6 : 1,
        transition: 'all 0.3s ease-out',
        animation: 'slideIn 0.3s ease-out'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: tagColor
          }} />
          <strong style={{ fontSize: '13px', color: '#374151' }}>{comment.author}</strong>
          {comment.resolved && (
            <span style={{
              fontSize: '10px',
              padding: '1px 6px',
              background: '#d1fae5',
              color: '#065f46',
              borderRadius: '10px'
            }}>已解决</span>
          )}
        </div>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
          {new Date(comment.timestamp).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>

      <p style={{
        fontSize: '12px',
        color: '#4b5563',
        margin: '4px 0 8px',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {comment.content}
      </p>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: '#6b7280'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span>💬 {comment.replies.length} 回复</span>
          <span>📍 行 {comment.version}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
            style={{
              padding: '2px 6px',
              background: comment.resolved ? '#f3f4f6' : '#d1fae5',
              color: comment.resolved ? '#6b7280' : '#065f46',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
            title={comment.resolved ? '重新打开' : '标记已解决'}
          >
            {comment.resolved ? '↩' : '✓'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              padding: '2px 6px',
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

const VirtualList = ({
  comments,
  onJumpToComment,
  onResolveComment,
  onDeleteComment
}: {
  comments: Comment[];
  onJumpToComment: (comment: Comment) => void;
  onResolveComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_ITEMS);
  const endIndex = Math.min(
    comments.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_ITEMS
  );

  const visibleComments = comments.slice(startIndex, endIndex);
  const totalHeight = comments.length * ITEM_HEIGHT;
  const offsetY = startIndex * ITEM_HEIGHT;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: '100%',
        overflow: 'auto',
        position: 'relative'
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          transform: `translateY(${offsetY}px)`
        }}>
          {visibleComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onJump={() => onJumpToComment(comment)}
              onResolve={() => onResolveComment(comment.id)}
              onDelete={() => onDeleteComment(comment.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const CommentPanel = ({
  comments,
  filterStatus,
  filterVersion,
  onFilterStatusChange,
  onFilterVersionChange,
  onJumpToComment,
  onResolveComment,
  onDeleteComment
}: CommentPanelProps) => {
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');

  const stats = useMemo(() => {
    const total = comments.length;
    const resolved = comments.filter(c => c.resolved).length;
    const unresolved = total - resolved;
    const redTags = comments.filter(c => c.tagColor === 'red').length;
    const blueTags = comments.filter(c => c.tagColor === 'blue').length;
    const greenTags = comments.filter(c => c.tagColor === 'green').length;
    return { total, resolved, unresolved, redTags, blueTags, greenTags };
  }, [comments]);

  const useVirtualList = comments.length > VIRTUAL_THRESHOLD;

  const statusOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: `全部 (${stats.total})` },
    { value: 'unresolved', label: `未解决 (${stats.unresolved})` },
    { value: 'resolved', label: `已解决 (${stats.resolved})` }
  ];

  const versionOptions: { value: FilterVersion; label: string }[] = [
    { value: 'all', label: '全部版本' },
    { value: 'old', label: '版本A' },
    { value: 'new', label: '版本B' }
  ];

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#f9fafb'
    }}>
      <div style={{
        padding: '16px',
        background: 'white',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1f2937',
            margin: 0
          }}>
            💬 批注列表
          </h3>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '4px 8px',
                background: viewMode === 'list' ? '#3b82f6' : '#f3f4f6',
                color: viewMode === 'list' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📋 列表
            </button>
            <button
              onClick={() => setViewMode('stats')}
              style={{
                padding: '4px 8px',
                background: viewMode === 'stats' ? '#3b82f6' : '#f3f4f6',
                color: viewMode === 'stats' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📊 统计
            </button>
          </div>
        </div>

        {useVirtualList && (
          <div style={{
            padding: '8px 12px',
            background: '#eff6ff',
            color: '#1e40af',
            borderRadius: '6px',
            fontSize: '12px',
            marginBottom: '12px'
          }}>
            ⚡ 已启用虚拟列表模式以优化性能
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {statusOptions.map(option => (
              <button
                key={option.value}
                onClick={() => onFilterStatusChange(option.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  background: filterStatus === option.value ? '#3b82f6' : '#f3f4f6',
                  color: filterStatus === option.value ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease-out'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {versionOptions.map(option => (
              <button
                key={option.value}
                onClick={() => onFilterVersionChange(option.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  background: filterVersion === option.value ? '#10b981' : '#f3f4f6',
                  color: filterVersion === option.value ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease-out'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === 'stats' ? (
        <div style={{ padding: '16px', flex: 1, overflow: 'auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              padding: '16px',
              background: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                批注总数
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>
                {stats.resolved}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                已解决
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>
                {stats.unresolved}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                待处理
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#8b5cf6' }}>
                {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                完成率
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', margin: '0 0 12px' }}>
            标签分布
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'white',
              borderRadius: '6px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#ef4444'
              }} />
              <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>重要</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                {stats.redTags}
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'white',
              borderRadius: '6px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#3b82f6'
              }} />
              <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>建议</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                {stats.blueTags}
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'white',
              borderRadius: '6px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#22c55e'
              }} />
              <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>已确认</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                {stats.greenTags}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {comments.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              color: '#9ca3af',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💭</div>
              <p style={{ fontSize: '14px', margin: '0 0 4px' }}>暂无批注</p>
              <p style={{ fontSize: '12px', margin: 0 }}>点击差异行添加批注</p>
            </div>
          ) : useVirtualList ? (
            <VirtualList
              comments={comments}
              onJumpToComment={onJumpToComment}
              onResolveComment={onResolveComment}
              onDeleteComment={onDeleteComment}
            />
          ) : (
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '12px 16px'
            }}>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onJump={() => onJumpToComment(comment)}
                  onResolve={() => onResolveComment(comment.id)}
                  onDelete={() => onDeleteComment(comment.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentPanel;
