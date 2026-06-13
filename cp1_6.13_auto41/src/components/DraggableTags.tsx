import { useState, useRef } from 'react';

interface DraggableTagsProps {
  allTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export function DraggableTags({ allTags, selectedTags, onChange }: DraggableTagsProps) {
  const [draggingTag, setDraggingTag] = useState<string | null>(null);
  const [dragOverPool, setDragOverPool] = useState<'selected' | 'available' | null>(null);
  const dragFromRef = useRef<'selected' | 'available' | null>(null);

  const availableTags = allTags.filter(t => !selectedTags.includes(t));

  const handleDragStart = (tag: string, from: 'selected' | 'available') => {
    setDraggingTag(tag);
    dragFromRef.current = from;
  };

  const handleDragEnd = () => {
    setDraggingTag(null);
    setDragOverPool(null);
    dragFromRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, pool: 'selected' | 'available') => {
    e.preventDefault();
    setDragOverPool(pool);
  };

  const handleDragLeave = () => {
    setDragOverPool(null);
  };

  const handleDrop = (e: React.DragEvent, targetPool: 'selected' | 'available') => {
    e.preventDefault();
    if (!draggingTag) return;

    if (dragFromRef.current === 'available' && targetPool === 'selected') {
      if (!selectedTags.includes(draggingTag)) {
        onChange([...selectedTags, draggingTag]);
      }
    } else if (dragFromRef.current === 'selected' && targetPool === 'available') {
      onChange(selectedTags.filter(t => t !== draggingTag));
    }

    setDraggingTag(null);
    setDragOverPool(null);
    dragFromRef.current = null;
  };

  const handleTagClick = (tag: string, isSelected: boolean) => {
    if (isSelected) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div className="pool-label">
          <span>已选偏好 ({selectedTags.length})</span>
        </div>
        <div
          className={`tag-pool ${dragOverPool === 'selected' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'selected')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'selected')}
        >
          {selectedTags.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              从下方拖拽或点击添加
            </span>
          ) : (
            selectedTags.map(tag => (
              <span
                key={tag}
                className={`draggable-tag selected ${draggingTag === tag ? 'dragging' : ''}`}
                draggable
                onDragStart={() => handleDragStart(tag, 'selected')}
                onDragEnd={handleDragEnd}
                onClick={() => handleTagClick(tag, true)}
                title="点击移除，或拖拽到下方"
              >
                {tag}
              </span>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="pool-label">
          <span>可选标签</span>
        </div>
        <div
          className={`tag-pool ${dragOverPool === 'available' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'available')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'available')}
        >
          {availableTags.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              全部已选
            </span>
          ) : (
            availableTags.map(tag => (
              <span
                key={tag}
                className={`draggable-tag ${draggingTag === tag ? 'dragging' : ''}`}
                draggable
                onDragStart={() => handleDragStart(tag, 'available')}
                onDragEnd={handleDragEnd}
                onClick={() => handleTagClick(tag, false)}
                title="点击添加，或拖拽到上方"
              >
                {tag}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
