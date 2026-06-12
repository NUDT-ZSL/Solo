import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import { useCollections } from './hooks/useCollections';
import { CollectionGrid } from './components/CollectionGrid';
import { AddLinkModal } from './components/AddLinkModal';
import { LinkItem } from './data/sampleData';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

const App: React.FC = () => {
  const {
    categories,
    links,
    activeCategory,
    setActiveCategory,
    addLink,
    addCategory,
    getLinksByCategory,
    getCategoryLinkCount,
    reorderLinks,
    moveLinkToCategory,
  } = useCollections();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLinkId, setNewLinkId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2000);
  }, []);

  const activeCategoryData = categories.find(c => c.id === activeCategory);
  const filteredLinks = getLinksByCategory(activeCategory);

  const handleAddLink = useCallback((data: {
    title: string;
    url: string;
    description: string;
    categoryId: string;
    tags: string[];
  }) => {
    const newLink = addLink(data);
    setNewLinkId(newLink.id);
    setIsModalOpen(false);
    showToast('链接添加成功！');
    setTimeout(() => setNewLinkId(null), 600);
  }, [addLink, showToast]);

  const handleShare = useCallback(async (link: LinkItem, type: 'copy' | 'social') => {
    if (type === 'copy') {
      try {
        await navigator.clipboard.writeText(link.url);
        showToast('已复制');
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = link.url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('已复制');
      }
    } else {
      const shareText = `【${link.title}】\n${link.description ? link.description + '\n' : ''}${link.url}`;
      showToast('已生成分享内容，模拟分享成功！', 'info');
      console.log('分享内容：', shareText);
    }
  }, [showToast]);

  const handleReorder = useCallback((startIndex: number, endIndex: number) => {
    reorderLinks(startIndex, endIndex, activeCategory);
  }, [reorderLinks, activeCategory]);

  const handleMoveToCategory = useCallback((linkId: string, categoryId: string) => {
    const targetCategory = categories.find(c => c.id === categoryId);
    moveLinkToCategory(linkId, categoryId);
    if (targetCategory) {
      showToast(`已移动到「${targetCategory.name}」`);
    }
  }, [moveLinkToCategory, categories, showToast]);

  const handleDragStart = useCallback(() => {
    // no-op
  }, []);

  const handleDragEnd = useCallback((result: DropResult) => {
    setDragOverCategory(null);

    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (destination.droppableId.startsWith('nav-category-')) {
      const categoryId = destination.droppableId.replace('nav-category-', '');
      if (categoryId !== 'all') {
        handleMoveToCategory(draggableId, categoryId);
        return;
      }
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (source.droppableId.startsWith('nav-category-')) {
      return;
    }

    if (destination.droppableId.startsWith('grid-category-') || destination.droppableId === 'links-grid') {
      handleReorder(source.index, destination.index);
    }
  }, [handleMoveToCategory, handleReorder]);

  const handleDragUpdate = useCallback((update: any) => {
    const { destination } = update;
    if (destination?.droppableId.startsWith('nav-category-')) {
      setDragOverCategory(destination.droppableId.replace('nav-category-', ''));
    } else {
      setDragOverCategory(null);
    }
  }, []);

  const defaultCategoryId = activeCategory !== 'all' ? activeCategory : undefined;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F5F5',
    }}>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'linear-gradient(135deg, #1A237E 0%, #283593 100%)',
        boxShadow: '0 2px 12px rgba(26, 35, 126, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 100,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}>
            🔗
          </div>
          <div>
            <div style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.1,
              letterSpacing: '0.3px',
            }}>
              LinkVault
            </div>
            <div style={{
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontWeight: 500,
            }}>
              链接管理与分享
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>
              {links.length} 个收藏
            </span>
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFB74D 0%, #FF8A65 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}>
            U
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', paddingTop: '60px' }}>
        <DragDropContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragUpdate={handleDragUpdate}
        >
          <aside style={{
            position: 'fixed',
            left: 0,
            top: '60px',
            bottom: 0,
            width: '240px',
            background: '#1A237E',
            padding: '16px 12px',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '10px',
                background: '#fff',
                color: '#1A237E',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '20px',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新建链接
            </button>

            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              padding: '8px 12px',
              marginBottom: '4px',
            }}>
              分类
            </div>

            {categories.map((category) => {
              const isActive = activeCategory === category.id;
              const count = getCategoryLinkCount(category.id);
              const isDragOver = dragOverCategory === category.id;

              return (
                <Droppable
                  key={category.id}
                  droppableId={`nav-category-${category.id}`}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      <button
                        onClick={() => setActiveCategory(category.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isActive
                            ? 'rgba(255, 255, 255, 0.12)'
                            : (isDragOver || snapshot.isDraggingOver
                                ? 'rgba(255, 255, 255, 0.08)'
                                : 'transparent'),
                          color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                          fontSize: '13px',
                          fontWeight: isActive ? 600 : 500,
                          position: 'relative',
                          borderLeft: isActive ? '3px solid #5C6BC0' : '3px solid transparent',
                          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                          marginBottom: '2px',
                          transform: (isDragOver || snapshot.isDraggingOver) ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: (isDragOver || snapshot.isDraggingOver)
                            ? '0 0 0 2px rgba(92, 107, 192, 0.5) inset'
                            : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.06)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive && !(isDragOver || snapshot.isDraggingOver)) {
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          }
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{category.icon}</span>
                        <span style={{ flex: 1, textAlign: 'left' }}>{category.name}</span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: isActive
                            ? 'rgba(255, 255, 255, 0.2)'
                            : 'rgba(255, 255, 255, 0.08)',
                          color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                        }}>
                          {count}
                        </span>
                      </button>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}

            <div style={{
              marginTop: '24px',
              padding: '16px 12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '8px',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFB74D 0%, #FF8A65 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  U
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    用户
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.5)',
                  }}>
                    免费版
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main style={{
            marginLeft: '240px',
            flex: 1,
            minHeight: 'calc(100vh - 60px)',
          }}>
            <CollectionGrid
              links={filteredLinks}
              activeCategory={activeCategoryData}
              onShare={handleShare}
              newLinkId={newLinkId}
            />
          </main>
        </DragDropContext>
      </div>

      <AddLinkModal
        isOpen={isModalOpen}
        categories={categories}
        defaultCategoryId={defaultCategoryId}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddLink}
        onAddCategory={addCategory}
      />

      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'none',
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: '10px 20px',
              background: 'rgba(26, 35, 126, 0.95)',
              color: '#fff',
              borderRadius: '24px',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: '0 8px 24px rgba(26, 35, 126, 0.3)',
              backdropFilter: 'blur(8px)',
              animation: 'fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'auto',
            }}
          >
            {toast.type === 'success' && '✓ '}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
