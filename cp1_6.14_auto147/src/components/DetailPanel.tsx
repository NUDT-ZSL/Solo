import React, { useState, useRef } from 'react';
import type { TimelineEntry } from '../data-service';

interface DetailPanelProps {
  entry: TimelineEntry | null;
  isMobile: boolean;
  onClose?: () => void;
  onUpdate: (id: number, updates: Partial<TimelineEntry>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const MONTH_NAMES_CN = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const DetailPanel: React.FC<DetailPanelProps> = ({
  entry,
  isMobile,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  if (!entry) {
    return (
      <div style={{
        ...styles.panel,
        ...(isMobile ? styles.mobilePanelHidden : {})
      }}>
        <div style={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 64 64" style={{ opacity: 0.25, marginBottom: 16 }}>
            <circle cx="32" cy="32" r="30" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3"/>
            <path d="M20 38L28 46L44 26" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
          </svg>
          <div style={styles.emptyTitle}>选择一条记录</div>
          <div style={styles.emptyHint}>点击左侧时间轴上的卡片<br/>查看完整内容和编辑</div>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${MONTH_NAMES_CN[date.getMonth()]}${date.getDate()}日`;
  };

  const handleStartEdit = () => {
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setIsEditing(true);
    setConfirmingDelete(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    const summary = editContent.slice(0, 80) + (editContent.length > 80 ? '...' : '');
    await onUpdate(entry.id!, {
      title: editTitle.trim(),
      content: editContent,
      summary
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirmingDelete) {
      await onDelete(entry.id!);
      setConfirmingDelete(false);
      setIsEditing(false);
    } else {
      setConfirmingDelete(true);
    }
  };

  const panel = (
    <div
      ref={panelRef}
      style={{
        ...styles.panel,
        ...(isMobile ? styles.mobilePanelVisible : {})
      }}
    >
      <div style={styles.panelInner}>
        {isMobile && (
          <div style={styles.mobileHeader}>
            <button onClick={onClose} style={styles.mobileCloseBtn}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <span style={styles.mobileHeaderTitle}>详细内容</span>
            <div style={{ width: 32 }} />
          </div>
        )}

        <div style={styles.dateRow}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span style={styles.dateText}>{formatDate(entry.date)}</span>
        </div>

        <div style={styles.actionRow}>
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={styles.titleInput}
                placeholder="请输入标题"
                autoFocus
              />
            ) : (
              <h1 style={styles.title}>{entry.title}</h1>
            )}
          </div>
          <div style={styles.actionButtons}>
            {!isEditing ? (
              <>
                <button
                  onClick={handleStartEdit}
                  style={styles.iconBtn}
                  title="编辑"
                  onMouseEnter={(e) => {
                    (e.currentTarget.firstChild as SVGElement).style.stroke = '#3b82f6';
                    e.currentTarget.style.background = '#eff6ff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget.firstChild as SVGElement).style.stroke = '#64748b';
                    e.currentTarget.style.background = '#f1f5f9';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.2s' }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    ...styles.iconBtn,
                    background: confirmingDelete ? '#fef2f2' : '#f1f5f9'
                  }}
                  title={confirmingDelete ? '确认删除' : '删除'}
                  onMouseEnter={(e) => {
                    const svg = e.currentTarget.firstChild as SVGElement;
                    svg.style.stroke = confirmingDelete ? '#ef4444' : '#ef4444';
                    if (!confirmingDelete) e.currentTarget.style.background = '#fee2e2';
                  }}
                  onMouseLeave={(e) => {
                    const svg = e.currentTarget.firstChild as SVGElement;
                    svg.style.stroke = confirmingDelete ? '#ef4444' : '#64748b';
                    if (!confirmingDelete) e.currentTarget.style.background = '#f1f5f9';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={confirmingDelete ? '#ef4444' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.2s' }}>
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancelEdit}
                  style={styles.cancelBtn}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  style={styles.saveBtn}
                >
                  保存
                </button>
              </>
            )}
          </div>
        </div>

        <div style={styles.contentWrapper}>
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={styles.contentTextarea}
              placeholder="记录您的故事..."
            />
          ) : (
            <div style={styles.content}>{entry.content}</div>
          )}
        </div>

        {!isEditing && entry.images.length > 0 && (
          <div style={styles.imagesSection}>
            <div style={styles.imagesLabel}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              相关图片（{entry.images.length}）
            </div>
            <div style={styles.imagesRow}>
              {entry.images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setPreviewImage(img)}
                  style={styles.thumbnail}
                >
                  <div style={{
                    ...styles.thumbnailPlaceholder,
                    background: `linear-gradient(135deg, ${getImageGradient(i)})`
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {entry.tags.length > 0 && (
          <div style={styles.tagsSection}>
            <div style={styles.tagsLabel}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
              标签
            </div>
            <div style={styles.tagsRow}>
              {entry.tags.map((tag, i) => (
                <span key={i} style={styles.tagPill}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {!isEditing && (
          <div style={styles.metaRow}>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>创建于</span>
              <span style={styles.metaValue}>{new Date(entry.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
            {entry.updatedAt !== entry.createdAt && (
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>更新于</span>
                <span style={styles.metaValue}>{new Date(entry.updatedAt).toLocaleDateString('zh-CN')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {previewImage && (
        <div style={styles.imageModal} onClick={() => setPreviewImage(null)}>
          <div style={{
            ...styles.largeImage,
            background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
          }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <div style={styles.imageModalClose}>点击任意位置关闭</div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        {entry && (
          <div style={styles.mobileOverlay} onClick={onClose} />
        )}
        {panel}
      </>
    );
  }

  return panel;
};

function getImageGradient(i: number): string {
  const gradients = [
    '#667eea 0%, #764ba2 100%',
    '#f093fb 0%, #f5576c 100%',
    '#4facfe 0%, #00f2fe 100%',
    '#43e97b 0%, #38f9d7 100%',
    '#fa709a 0%, #fee140 100%',
    '#30cfd0 0%, #330867 100%',
    '#a8edea 0%, #fed6e3 100%'
  ];
  return gradients[i % gradients.length];
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '40%',
    background: '#f9fafb',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  } as React.CSSProperties,
  mobilePanelHidden: {
    width: '100%',
    display: 'none'
  },
  mobilePanelVisible: {
    width: '100%',
    position: 'fixed',
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    background: '#f9fafb'
  },
  mobileOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 998
  },
  panelInner: {
    flex: 1,
    overflowY: 'auto',
    padding: 24,
    boxSizing: 'border-box'
  } as React.CSSProperties,
  mobileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 0 16px 0',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: 16
  },
  mobileCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: '#f1f5f9',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  } as React.CSSProperties,
  mobileHeaderTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#0f172a'
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 40
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  emptyHint: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.8,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: '8px 14px',
    background: '#eff6ff',
    borderRadius: 10,
    alignSelf: 'flex-start'
  },
  dateText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: 500,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  actionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.3,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  titleInput: {
    width: '100%',
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1.3,
    padding: '8px 12px',
    margin: '2px 0',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    outline: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    color: '#0f172a',
    background: 'white',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease-in-out'
  } as React.CSSProperties,
  actionButtons: {
    display: 'flex',
    gap: 8,
    flexShrink: 0
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: '#f1f5f9',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease-in-out'
  } as React.CSSProperties,
  saveBtn: {
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    background: '#3b82f6',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
  } as React.CSSProperties,
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    background: '#f3f4f6',
    color: '#374151',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
  } as React.CSSProperties,
  contentWrapper: {
    marginBottom: 20
  },
  content: {
    fontSize: 16,
    lineHeight: 1.8,
    color: '#374151',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  contentTextarea: {
    width: '100%',
    minHeight: 120,
    padding: 12,
    fontSize: 16,
    lineHeight: 1.8,
    borderRadius: 6,
    border: '1px solid #d1d5db',
    outline: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    color: '#374151',
    background: 'white',
    resize: 'vertical',
    boxSizing: 'border-box',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    transition: 'all 0.2s ease-in-out'
  } as React.CSSProperties,
  imagesSection: {
    marginBottom: 20
  },
  imagesLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 10,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  imagesRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 8,
    scrollbarWidth: 'thin'
  },
  thumbnail: {
    width: 120,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
    cursor: 'pointer',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s ease-in-out'
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tagsSection: {
    marginBottom: 20
  },
  tagsLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 10,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6
  },
  tagPill: {
    background: '#eff6ff',
    color: '#1e40af',
    fontSize: 12,
    fontWeight: 500,
    padding: '5px 14px',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 16,
    borderTop: '1px solid #e2e8f0',
    marginTop: 'auto'
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  metaLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 500,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  metaValue: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 500,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  imageModal: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  largeImage: {
    width: '80%',
    maxWidth: 600,
    aspectRatio: '4 / 3',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
  },
  imageModalClose: {
    marginTop: 24,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  }
};

export default DetailPanel;
