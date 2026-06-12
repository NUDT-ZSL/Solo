import React from 'react';
import { Droppable, DroppableProvided, DroppableStateSnapshot } from 'react-beautiful-dnd';
import { LinkItem, Category } from '../data/sampleData';
import { LinkCard } from './LinkCard';

interface CollectionGridProps {
  links: LinkItem[];
  activeCategory: Category | undefined;
  onShare: (link: LinkItem, type: 'copy' | 'social') => void;
  newLinkId?: string | null;
}

export const CollectionGrid: React.FC<CollectionGridProps> = ({
  links,
  activeCategory,
  onShare,
  newLinkId,
}) => {
  const droppableId = activeCategory ? `grid-category-${activeCategory.id}` : 'links-grid';

  return (
    <div style={{
      padding: '24px 32px',
      minHeight: 'calc(100vh - 60px)',
    }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <span style={{ fontSize: '28px' }}>{activeCategory?.icon || '📚'}</span>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#1A237E',
              marginBottom: '2px',
            }}>
              {activeCategory?.name || '全部链接'}
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#888',
            }}>
              共 {links.length} 个链接收藏
            </p>
          </div>
        </div>

        {links.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            color: '#999',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>这个分类还没有链接</p>
            <p style={{ fontSize: '13px' }}>点击左侧"新建链接"按钮添加第一个收藏吧</p>
          </div>
        ) : (
          <Droppable
            droppableId={droppableId}
            direction="vertical"
          >
            {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                  padding: snapshot.isDraggingOver ? '16px' : '0',
                  margin: snapshot.isDraggingOver ? '-16px' : '0',
                  background: snapshot.isDraggingOver ? 'rgba(26, 35, 126, 0.03)' : 'transparent',
                  borderRadius: '12px',
                  transition: 'background 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {links.map((link, index) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    index={index}
                    onShare={onShare}
                    isNew={link.id === newLinkId}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </div>
  );
};
