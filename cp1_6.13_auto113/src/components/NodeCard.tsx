import { useState, useRef, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { BookmarkNode } from '../api/bookmarks';

interface NodeCardProps {
  node: BookmarkNode;
  index: number;
  isNew?: boolean;
  isDeleting?: boolean;
  isDropTarget?: boolean;
  isDragging?: boolean;
  onAdd: (parentId: string, title: string, url: string) => void;
  onDelete: (id: string) => void;
}

function getGradientFromUrl(url: string): string {
  if (!url || url.trim() === '') {
    return 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
  }

  let domain = '';
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    domain = urlObj.hostname;
  } catch {
    domain = url;
  }

  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    const char = domain.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 30 + (Math.abs(hash >> 8) % 30)) % 360;
  const sat1 = 65 + (Math.abs(hash >> 4) % 15);
  const sat2 = 60 + (Math.abs(hash >> 6) % 20);

  return `linear-gradient(135deg, hsl(${hue1}, ${sat1}%, 58%) 0%, hsl(${hue2}, ${sat2}%, 48%) 100%)`;
}

function getFaviconLetter(title: string): string {
  if (!title) return '?';
  return title.charAt(0).toUpperCase();
}

export default function NodeCard({
  node,
  index,
  isNew = false,
  isDeleting = false,
  isDropTarget = false,
  isDragging = false,
  onAdd,
  onDelete,
}: NodeCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const gradient = getGradientFromUrl(node.url);
  const faviconLetter = getFaviconLetter(node.title);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    tooltipTimerRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }
    setShowTooltip(false);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddForm(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onAdd(node._id, newTitle.trim(), newUrl.trim());
      setNewTitle('');
      setNewUrl('');
      setShowAddForm(false);
    }
  };

  const handleAddCancel = () => {
    setNewTitle('');
    setNewUrl('');
    setShowAddForm(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDelete(node._id);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const cardStyle: React.CSSProperties = {
    width: '240px',
    height: '72px',
    backgroundColor: isDropTarget ? '#eef2ff' : '#ffffff',
    borderRadius: '12px',
    boxShadow: isDropTarget
      ? '0 4px 16px rgba(99, 102, 241, 0.25)'
      : '0 2px 8px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    cursor: 'grab',
    position: 'relative',
    border: isDropTarget ? '2px solid #6366f1' : '2px solid transparent',
    transition: 'box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
    transform: isDeleting ? 'scale(0)' : isNew ? 'scale(1)' : 'scale(1)',
    opacity: isDragging ? 0.7 : 1,
    animation: isNew ? 'scaleIn 0.4s ease-out' : undefined,
    transitionProperty: isDeleting ? 'transform' : undefined,
    transitionDuration: isDeleting ? '0.3s' : undefined,
    transitionTimingFunction: 'easeInOut',
    userSelect: 'none',
  };

  return (
    <Draggable draggableId={node._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={(el) => {
            provided.innerRef(el);
            (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            ...cardStyle,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.15)';
          }}
          onMouseOut={(e) => {
            if (!isDropTarget) {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
            }
          }}
        >
          <style>{`
            @keyframes scaleIn {
              0% { transform: scale(0); }
              60% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
          `}</style>

          {showTooltip && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                fontSize: '14px',
                padding: '8px 12px',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                pointerEvents: 'none',
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{node.title}</div>
              {node.url && <div style={{ fontSize: '12px', opacity: 0.8 }}>{node.url}</div>}
            </div>
          )}

          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: 'bold',
              flexShrink: 0,
            }}
          >
            {faviconLetter}
          </div>

          <div
            style={{
              marginLeft: '12px',
              flex: 1,
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '20px',
              }}
              title={node.title}
            >
              {node.title}
            </div>
            {node.url && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '18px',
                  marginTop: '4px',
                }}
                title={node.url}
              >
                {node.url}
              </div>
            )}
          </div>

          {!node.isRoot && (
            <button
              onClick={handleDeleteClick}
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              ×
            </button>
          )}

          <button
            onClick={handleAddClick}
            style={{
              position: 'absolute',
              bottom: '-12px',
              right: '-12px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              transition: 'background-color 0.2s ease, transform 0.2s ease',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4f46e5';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6366f1';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            +
          </button>

          {showAddForm && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 2000,
                }}
                onClick={handleAddCancel}
              />
              <div
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  zIndex: 2001,
                  width: '360px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#1e293b' }}>
                  添加子书签
                </h3>
                <form onSubmit={handleAddSubmit}>
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        color: '#64748b',
                        marginBottom: '8px',
                      }}
                    >
                      标题
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="请输入书签标题"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#6366f1';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                      }}
                      autoFocus
                    />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        color: '#64748b',
                        marginBottom: '8px',
                      }}
                    >
                      URL
                    </label>
                    <input
                      type="text"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="请输入书签网址"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#6366f1';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleAddCancel}
                      style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e2e8f0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }}
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        backgroundColor: '#6366f1',
                        color: '#ffffff',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4f46e5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#6366f1';
                      }}
                    >
                      添加
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {showDeleteConfirm && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 2000,
                }}
                onClick={handleDeleteCancel}
              />
              <div
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  zIndex: 2001,
                  width: '320px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#1e293b' }}>
                  确认删除
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '22px' }}>
                  确定要删除书签「{node.title}」吗？其子节点将自动提升一级连接到父节点。
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleDeleteCancel}
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: '#f1f5f9',
                      color: '#94a3b8',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e2e8f0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ef4444';
                    }}
                  >
                    确认删除
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Draggable>
  );
}
