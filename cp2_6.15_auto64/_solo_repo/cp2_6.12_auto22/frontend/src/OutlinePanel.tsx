import React, { useState } from 'react';
import { ChevronRight, GripVertical } from 'lucide-react';
import { useStore } from './store';
import type { Chapter } from './types';

const OutlinePanel: React.FC = () => {
  const project = useStore((s) => s.project);
  const currentChapterId = useStore((s) => s.currentChapterId);
  const setCurrentChapterId = useStore((s) => s.setCurrentChapterId);
  const toggleChapterExpand = useStore((s) => s.toggleChapterExpand);
  const reorderChapters = useStore((s) => s.reorderChapters);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  if (!project) return null;

  const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);

  const handleDragStart = (e: React.DragEvent, chapter: Chapter) => {
    setDraggingId(chapter.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', chapter.id);
  };

  const handleDragOver = (e: React.DragEvent, chapterId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (chapterId !== draggingId) {
      setDragOverId(chapterId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggingId && draggingId !== targetId) {
      reorderChapters(draggingId, targetId);
    }
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <aside className="outline-panel">
      <div className="panel-header">
        <span>章节大纲</span>
      </div>
      <div className="chapter-list">
        {sortedChapters.map((chapter) => (
          <div
            key={chapter.id}
            className={`chapter-item ${chapter.id === currentChapterId ? 'active' : ''} ${draggingId === chapter.id ? 'dragging' : ''} ${dragOverId === chapter.id ? 'drag-over' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, chapter)}
            onDragOver={(e) => handleDragOver(e, chapter.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, chapter.id)}
            onDragEnd={handleDragEnd}
            onClick={() => setCurrentChapterId(chapter.id)}
          >
            <div className="chapter-header">
              <GripVertical size={14} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
              <span className="chapter-title">{chapter.title}</span>
              <button
                className={`chapter-toggle ${chapter.expanded ? 'expanded' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleChapterExpand(chapter.id);
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
            {chapter.expanded && (
              <div className="chapter-body">
                <p className="chapter-description">{chapter.description || '暂无场景描述'}</p>
                <div className="chapter-tags">
                  {chapter.characterTags.map((tag) => (
                    <span key={tag} className="tag-chip">{tag}</span>
                  ))}
                  {chapter.characterTags.length === 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>暂无角色</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default OutlinePanel;
