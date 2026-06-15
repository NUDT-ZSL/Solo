import React from 'react';
import type { Annotation, AnnotationType } from './types';

interface SidebarProps {
  annotations: Annotation[];
  onJumpToAnnotation: (annotation: Annotation) => void;
  onExport: () => void;
  onDeleteAnnotation: (id: string) => void;
}

const truncateText = (text: string, maxLength: number = 30): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

const getTypeIcon = (type: AnnotationType): { icon: string; label: string } => {
  switch (type) {
    case 'highlight':
      return { icon: '▉', label: '高亮' };
    case 'underline':
      return { icon: '_', label: '下划线' };
    case 'note':
      return { icon: '💬', label: '笔记' };
    default:
      return { icon: '•', label: '标注' };
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  annotations,
  onJumpToAnnotation,
  onExport,
  onDeleteAnnotation,
}) => {
  const groupByPage = (anns: Annotation[]): Map<number, Annotation[]> => {
    const groups = new Map<number, Annotation[]>();
    const sorted = [...anns].sort((a, b) => a.pageNumber - b.pageNumber || a.createdAt - b.createdAt);
    for (const ann of sorted) {
      if (!groups.has(ann.pageNumber)) {
        groups.set(ann.pageNumber, []);
      }
      groups.get(ann.pageNumber)!.push(ann);
    }
    return groups;
  };

  const groupedAnnotations = groupByPage(annotations);
  const totalCount = annotations.length;

  const handleItemClick = (e: React.MouseEvent, annotation: Annotation) => {
    const target = e.target as HTMLElement;
    if (target.closest('.annotation-delete-btn')) {
      e.stopPropagation();
      onDeleteAnnotation(annotation.id);
      return;
    }
    onJumpToAnnotation(annotation);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="sidebar-title">标注汇总</span>
          <span className="sidebar-count">{totalCount}</span>
        </div>
        <button
          className="sidebar-export-btn"
          onClick={onExport}
          disabled={totalCount === 0}
          style={{ opacity: totalCount === 0 ? 0.4 : 1, cursor: totalCount === 0 ? 'not-allowed' : 'pointer' }}
        >
          <span>⬇</span>
          <span>导出</span>
        </button>
      </div>

      <div className="sidebar-content">
        {totalCount === 0 ? (
          <div className="sidebar-empty">
            <div className="sidebar-empty-icon">📝</div>
            <span>暂无标注</span>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>选中文本即可添加标注</span>
          </div>
        ) : (
          Array.from(groupedAnnotations.entries()).map(([pageNumber, pageAnnotations]) => (
            <div key={pageNumber} className="sidebar-page-group">
              <div className="sidebar-page-header">
                第 {pageNumber} 页
              </div>
              {pageAnnotations.map((annotation) => {
                const { icon } = getTypeIcon(annotation.type);
                return (
                  <div
                    key={annotation.id}
                    className={`sidebar-annotation-item ${annotation.type}-item`}
                    onClick={(e) => handleItemClick(e, annotation)}
                    title={annotation.text}
                  >
                    <div className={`annotation-type-icon ${annotation.type}-icon`}>
                      {icon}
                    </div>
                    <div className="annotation-summary">
                      <div className="annotation-text">
                        {truncateText(annotation.text)}
                      </div>
                      {annotation.type === 'note' && annotation.noteContent && (
                        <div className="annotation-note-preview">
                          💬 {truncateText(annotation.noteContent, 25)}
                        </div>
                      )}
                    </div>
                    <button
                      className="annotation-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAnnotation(annotation.id);
                      }}
                      style={{
                        opacity: 0,
                        transition: 'opacity 0.15s',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#b8a98e',
                        fontSize: '14px',
                        padding: '2px 4px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                      title="删除标注"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
