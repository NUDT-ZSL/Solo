import React from 'react';
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
              className="mark-item"
              onClick={() => onMarkClick(annotation.id)}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(annotation.id);
                }}
                title="删除批注"
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
