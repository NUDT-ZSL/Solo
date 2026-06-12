import React, { useState, useEffect } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import type { Bookmark, Tag } from '../types';

interface BookmarkCardProps {
  bookmark: Bookmark;
  index: number;
  tags: Tag[];
  onDelete: (id: string) => void;
  onTagToggle: (bookmarkId: string, tagId: string) => void;
}

const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark, index, tags, onDelete, onTagToggle }) => {
  const [iconError, setIconError] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIconError(false);
  }, [bookmark.icon]);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.tag-menu-trigger') ||
        (e.target as HTMLElement).closest('.context-menu')) {
      return;
    }
    setIsClicked(true);
    setTimeout(() => {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
      setIsClicked(false);
    }, 150);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(bookmark.id);
    }, 300);
  };

  const handleIconError = () => {
    setIconError(true);
  };

  const bookmarkTags = tags.filter(tag => bookmark.tags.includes(tag.name));

  return (
    <Draggable draggableId={bookmark.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          style={{
            ...provided.draggableProps.style,
            opacity: isDeleting ? 0 : 1,
            transform: isDeleting ? 'scale(0.8)' : isClicked ? 'scale(1.1)' : snapshot.isDragging ? 'scale(1.02)' : 'scale(1)',
            transition: 'opacity 300ms ease, transform 150ms ease, box-shadow 200ms ease',
          }}
          className="bookmark-card"
        >
          <div
            style={{
              backgroundColor: '#2a2a3e',
              borderRadius: '12px',
              border: `1px solid ${snapshot.isDragging ? '#ffffff' : '#3a3a4e'}`,
              padding: '16px',
              cursor: 'pointer',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: snapshot.isDragging
                ? '0 12px 40px rgba(0, 0, 0, 0.4)'
                : '0 2px 8px rgba(0, 0, 0, 0.2)',
              transform: snapshot.isDragging ? 'translateY(-2px)' : 'translateY(0)',
              transition: 'border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease',
            }}
            onMouseEnter={(e) => {
              if (!snapshot.isDragging) {
                e.currentTarget.style.borderColor = '#ffffff';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!snapshot.isDragging) {
                e.currentTarget.style.borderColor = '#3a3a4e';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: iconError ? '#3a3a4e' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {iconError ? (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6a6a8e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                ) : (
                  <img
                    src={bookmark.icon}
                    alt=""
                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                    onError={handleIconError}
                    draggable={false}
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    color: '#d0d0e0',
                    fontSize: '14px',
                    fontWeight: 600,
                    lineHeight: 1.4,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                  title={bookmark.title}
                >
                  {bookmark.title}
                </h3>
              </div>
            </div>

            <p
              style={{
                color: '#7a7a9e',
                fontSize: '12px',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={bookmark.url}
            >
              {bookmark.url}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
              {bookmarkTags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: '#ffffff',
                    background: tag.gradient,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    fontWeight: 500,
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {bookmarkTags.length > 3 && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: '#7a7a9e',
                    backgroundColor: '#3a3a4e',
                    fontWeight: 500,
                  }}
                >
                  +{bookmarkTags.length - 3}
                </span>
              )}
              <div
                className="tag-menu-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTagMenu(!showTagMenu);
                }}
                style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  color: '#7a7a9e',
                  backgroundColor: '#3a3a4e',
                  cursor: 'pointer',
                  fontWeight: 500,
                  marginLeft: 'auto',
                }}
              >
                +标签
              </div>
            </div>

            {showTagMenu && (
              <div
                className="context-menu"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: '8px',
                  backgroundColor: '#2a2a3e',
                  border: '1px solid #3a3a4e',
                  borderRadius: '8px',
                  padding: '8px',
                  zIndex: 100,
                  minWidth: '120px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div style={{ fontSize: '12px', color: '#7a7a9e', marginBottom: '8px' }}>
                  选择标签:
                </div>
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    onClick={() => {
                      onTagToggle(bookmark.id, tag.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#d0d0e0',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#3a3a4e';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: tag.gradient,
                      }}
                    />
                    <span>{tag.name}</span>
                    {bookmark.tags.includes(tag.name) && (
                      <span style={{ marginLeft: 'auto', color: '#4ecdc4' }}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default BookmarkCard;
