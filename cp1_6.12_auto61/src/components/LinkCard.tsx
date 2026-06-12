import React, { useState, useEffect, useRef } from 'react';
import { Draggable, DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { LinkItem, tagColors } from '../data/sampleData';

interface LinkCardProps {
  link: LinkItem;
  index: number;
  onShare?: (link: LinkItem, type: ShareAction) => void;
  isNew?: boolean;
}

type ShareAction = 'copy' | 'social';

interface ShareMenuState {
  visible: boolean;
  closing: boolean;
}

const getFaviconUrl = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return '';
  }
};

export const LinkCard: React.FC<LinkCardProps> = ({ link, index, onShare, isNew }) => {
  const [showMenu, setShowMenu] = useState<ShareMenuState>({ visible: false, closing: false });
  const [imgError, setImgError] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNew) {
      requestAnimationFrame(() => {
        setAnimateIn(true);
      });
    }
  }, [isNew]);

  const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return tagColors[Math.abs(hash) % tagColors.length];
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (showMenu.visible && !showMenu.closing) {
      setShowMenu({ visible: true, closing: true });
      setTimeout(() => setShowMenu({ visible: false, closing: false }), 200);
    } else if (!showMenu.visible) {
      setShowMenu({ visible: true, closing: false });
    }
  };

  const handleMenuAction = (type: ShareAction, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onShare?.(link, type);
    setShowMenu({ visible: true, closing: true });
    setTimeout(() => setShowMenu({ visible: false, closing: false }), 200);
  };

  return (
    <Draggable draggableId={link.id} index={index}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={animateIn ? 'fade-in' : ''}
          style={{
            ...provided.draggableProps.style,
            transform: snapshot.isDragging
              ? (provided.draggableProps.style as React.CSSProperties)?.transform
              : undefined,
            transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (showMenu.visible) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              background: '#ffffff',
              borderRadius: '2px',
              padding: '16px',
              boxShadow: snapshot.isDragging
                ? '0 8px 25px rgba(26, 35, 126, 0.2)'
                : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              textDecoration: 'none',
              color: 'inherit',
              opacity: snapshot.isDragging ? 0.85 : 1,
              transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              cursor: snapshot.isDragging ? 'grabbing' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!snapshot.isDragging) {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                  '0 6px 16px rgba(0,0,0,0.1), 0 3px 6px rgba(0,0,0,0.06)';
                (e.currentTarget as HTMLAnchorElement).style.transform =
                  'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!snapshot.isDragging) {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)';
                (e.currentTarget as HTMLAnchorElement).style.transform =
                  'translateY(0)';
              }
            }}
          >
            <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
              <div style={{
                width: '48px',
                height: '48px',
                flexShrink: 0,
                borderRadius: '8px',
                background: '#F5F5F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {!imgError ? (
                  <img
                    src={getFaviconUrl(link.url)}
                    alt=""
                    width="32"
                    height="32"
                    onError={() => setImgError(true)}
                    style={{ objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontSize: '20px' }}>🌐</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1A237E',
                  lineHeight: 1.4,
                  marginBottom: '6px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {link.title}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {link.description}
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginTop: '12px',
              gap: '8px',
            }}>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                flex: 1,
              }}>
                {link.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 500,
                      background: getTagColor(tag),
                      color: '#333',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={handleShareClick}
                  style={{
                    width: '28px',
                    height: '28px',
                    border: 'none',
                    background: '#F5F5F5',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                    color: '#1A237E',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#E8EAF6';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
                {showMenu.visible && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      bottom: '36px',
                      right: 0,
                      background: '#ffffff',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      padding: '6px',
                      minWidth: '140px',
                      zIndex: 100,
                      opacity: showMenu.closing ? 0 : 1,
                      transform: showMenu.closing ? 'translateY(4px) scale(0.96)' : 'translateY(0) scale(1)',
                      transition: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <button
                      onClick={(e) => handleMenuAction('copy', e)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#333',
                        transition: 'background 200ms',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      复制链接
                    </button>
                    <button
                      onClick={(e) => handleMenuAction('social', e)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#333',
                        transition: 'background 200ms',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      分享到社交
                    </button>
                  </div>
                )}
              </div>
            </div>
          </a>
        </div>
      )}
    </Draggable>
  );
};
