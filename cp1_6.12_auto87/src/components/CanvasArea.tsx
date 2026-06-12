import React from 'react';
import { DragDropContext, Droppable, type DropResult } from 'react-beautiful-dnd';
import BookmarkCard from './BookmarkCard';
import type { Bookmark, Tag } from '../types';

interface CanvasAreaProps {
  bookmarks: Bookmark[];
  tags: Tag[];
  activeTag: string | null;
  gap: number;
  onDelete: (id: string) => void;
  onTagToggle: (bookmarkId: string, tagId: string) => void;
  onDragEnd: (result: DropResult) => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  bookmarks,
  tags,
  activeTag,
  gap,
  onDelete,
  onTagToggle,
  onDragEnd,
}) => {
  const displayTags = activeTag
    ? tags.filter((t) => t.id === activeTag)
    : tags;

  const getBookmarksForTag = (tagName: string): Bookmark[] => {
    return bookmarks.filter((b) => b.tags.includes(tagName));
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: `${gap}px`,
        }}
      >
        {displayTags.length === 0 && bookmarks.length > 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6a6a8e',
            }}
          >
            暂无标签，请先创建标签
          </div>
        )}

        {displayTags.map((tag) => {
          const tagBookmarks = getBookmarksForTag(tag.name);

          return (
            <div key={tag.id} className="tag-row" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  paddingLeft: '4px',
                }}
              >
                <div
                  style={{
                    width: '4px',
                    height: '20px',
                    borderRadius: '2px',
                    background: tag.gradient,
                  }}
                />
                <h2
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#d0d0e0',
                    margin: 0,
                  }}
                >
                  {tag.name}
                </h2>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#6a6a8e',
                    backgroundColor: '#2a2a3e',
                    padding: '2px 8px',
                    borderRadius: '10px',
                  }}
                >
                  {tagBookmarks.length}
                </span>
              </div>

              <Droppable droppableId={tag.id} direction="horizontal">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: '16px',
                      padding: snapshot.isDraggingOver ? '20px' : '0',
                      backgroundColor: snapshot.isDraggingOver ? 'rgba(78, 205, 196, 0.05)' : 'transparent',
                      borderRadius: '16px',
                      transition: 'padding 400ms ease-out, background-color 200ms ease',
                      minHeight: '100px',
                    }}
                    className="droppable-area"
                  >
                    {tagBookmarks.map((bookmark, index) => (
                      <BookmarkCard
                        key={`${bookmark.id}-${tag.id}`}
                        bookmark={bookmark}
                        index={index}
                        tags={tags}
                        onDelete={onDelete}
                        onTagToggle={onTagToggle}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

        {bookmarks.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#6a6a8e',
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4a4a6e"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: '16px' }}
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ fontSize: '16px', margin: '0 0 8px 0' }}>还没有书签</p>
            <p style={{ fontSize: '13px', color: '#5a5a7e' }}>
              从左侧导入Chrome书签JSON或手动添加
            </p>
          </div>
        )}
      </div>
    </DragDropContext>
  );
};

export default CanvasArea;
