import React, { useCallback, useRef, useState } from 'react';
import { Annotation } from './App';

interface MarksListProps {
  annotations: Annotation[];
  onDelete: (id: string) => void;
  onMarkClick: (id: string) => void;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

export default function MarksList({ annotations, onDelete, onMarkClick }: MarksListProps) {
  const clickLockRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleMarkClick = useCallback(
    (id: string) => {
      if (clickLockRef.current) return;
      clickLockRef.current = true;
      setActiveId(id);
      onMarkClick(id);
      setTimeout(() => {
        clickLockRef.current = false;
        setActiveId(null);
      }, 500);
    },
    [onMarkClick]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      onDelete(id);
    },
    [onDelete]
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        批注列表
        <span>{annotations.length} 条</span>
      </div>
      <div className="marks-list">
        {annotations.length === 0 ? (
          <div className="empty-marks">暂无批注，请在左侧文本中拖拽选取文字添加</div>
        ) : (
          annotations.map((annotation) => (
            <div
              key={annotation.id}
              className={`mark-item${activeId === annotation.id ? ' active' : ''}`}
              onClick={() => handleMarkClick(annotation.id)}
            >
              <div className="mark-item-text">
                <div className="mark-excerpt">
                  {truncate(annotation.selectedText, 10)}
                </div>
                {annotation.comment && (
                  <div className="mark-comment">
                    {truncate(annotation.comment, 20)}
                  </div>
                )}
              </div>
              <button
                className="mark-delete"
                onClick={(e) => handleDelete(e, annotation.id)}
                title="删除批注"
                type="button"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
