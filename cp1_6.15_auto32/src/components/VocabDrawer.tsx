import React, { useState, useMemo, useCallback } from 'react';
import type { VocabWord } from '../types';

interface VocabDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  words: VocabWord[];
  onDelete: (ids: string[]) => void;
  onExport: () => void;
}

export const VocabDrawer: React.FC<VocabDrawerProps> = ({
  isOpen,
  onClose,
  words,
  onDelete,
  onExport,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const sortedWords = useMemo(() => {
    return [...words].sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.addedAt - a.addedAt;
      } else {
        return a.addedAt - b.addedAt;
      }
    });
  }, [words, sortOrder]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedWords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedWords.map(w => w.id)));
    }
  }, [selectedIds.size, sortedWords]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    onDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds, onDelete]);

  const handleToggleSort = useCallback(() => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = useCallback(() => {
    const headers = ['原词', '简化词', '释义', '难度级别', '添加时间'];
    const rows = sortedWords.map(word => [
      word.original,
      word.simplified,
      word.definition,
      `L${word.level}`,
      formatDate(word.addedAt),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `生词本_${new Date().toLocaleDateString('zh-CN')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    onExport();
  }, [sortedWords, onExport]);

  return (
    <>
      <div 
        className={`drawer-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      
      <div className={`vocab-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-title">
            <h3>生词本</h3>
            <span className="word-count-badge">{words.length} 词</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="drawer-toolbar">
          <label className="select-all">
            <input
              type="checkbox"
              checked={selectedIds.size === sortedWords.length && sortedWords.length > 0}
              onChange={handleSelectAll}
              disabled={sortedWords.length === 0}
            />
            <span>全选</span>
          </label>
          
          <button
            className="sort-btn"
            onClick={handleToggleSort}
            title={sortOrder === 'desc' ? '按时间倒序' : '按时间正序'}
          >
            {sortOrder === 'desc' ? '↓ 时间倒序' : '↑ 时间正序'}
          </button>
        </div>

        <div className="drawer-actions">
          <button
            className={`delete-btn ${selectedIds.size > 0 ? 'active' : ''}`}
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
          >
            删除 ({selectedIds.size})
          </button>
          <button
            className="export-btn"
            onClick={exportToCSV}
            disabled={words.length === 0}
          >
            导出 CSV
          </button>
        </div>

        <div className="drawer-content">
          {sortedWords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p>还没有收藏生词</p>
              <p className="empty-hint">点击文章中的高亮词即可添加到生词本</p>
            </div>
          ) : (
            <div className="word-list">
              {sortedWords.map((word) => (
                <div
                  key={word.id}
                  className={`word-item ${selectedIds.has(word.id) ? 'selected' : ''}`}
                >
                  <label className="word-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(word.id)}
                      onChange={() => handleToggleSelect(word.id)}
                    />
                  </label>
                  
                  <div className="word-info">
                    <div className="word-row">
                      <span className="word-original">{word.original}</span>
                      <span className={`word-level level-${word.level}`}>L{word.level}</span>
                    </div>
                    <div className="word-simplified">→ {word.simplified}</div>
                    <div className="word-definition">{word.definition}</div>
                    <div className="word-date">{formatDate(word.addedAt)}</div>
                  </div>

                  <button
                    className="delete-word-btn"
                    onClick={() => onDelete([word.id])}
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <style>{`
          .drawer-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.3);
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
            z-index: 999;
          }
          
          .drawer-overlay.open {
            opacity: 1;
            visibility: visible;
          }
          
          .vocab-drawer {
            position: fixed;
            top: 0;
            right: 0;
            width: 400px;
            height: 100vh;
            background: #fff;
            box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            display: flex;
            flex-direction: column;
          }
          
          .vocab-drawer.open {
            transform: translateX(0);
          }
          
          .drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #f0f0f0;
          }
          
          .drawer-title {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .drawer-title h3 {
            margin: 0;
            font-size: 18px;
            color: #333;
          }
          
          .word-count-badge {
            padding: 2px 10px;
            background: #e8f0fe;
            color: #4A90D9;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }
          
          .close-btn {
            width: 32px;
            height: 32px;
            border: none;
            background: #f5f5f5;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            color: #666;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          
          .close-btn:hover {
            background: #e0e0e0;
          }
          
          .drawer-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 24px;
            border-bottom: 1px solid #f0f0f0;
          }
          
          .select-all {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-size: 13px;
            color: #666;
          }
          
          .select-all input[type="checkbox"] {
            cursor: pointer;
          }
          
          .sort-btn {
            padding: 6px 12px;
            background: #f5f5f5;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            color: #666;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .sort-btn:hover {
            background: #e8e8e8;
          }
          
          .drawer-actions {
            display: flex;
            gap: 8px;
            padding: 12px 24px;
            border-bottom: 1px solid #f0f0f0;
          }
          
          .delete-btn {
            flex: 1;
            padding: 8px 16px;
            background: #f5f5f5;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            color: #999;
            cursor: not-allowed;
            transition: all 0.2s ease;
          }
          
          .delete-btn.active {
            background: #ffebee;
            color: #f44336;
            cursor: pointer;
          }
          
          .delete-btn.active:hover {
            background: #ffcdd2;
          }
          
          .export-btn {
            flex: 1;
            padding: 8px 16px;
            background: #4A90D9;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            color: #fff;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .export-btn:hover:not(:disabled) {
            background: #3a7bc8;
          }
          
          .export-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .drawer-content {
            flex: 1;
            overflow-y: auto;
            padding: 12px 24px 24px;
          }
          
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
          }
          
          .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          
          .empty-state p {
            margin: 0;
            color: #666;
            font-size: 14px;
          }
          
          .empty-hint {
            font-size: 12px !important;
            color: #999 !important;
            margin-top: 8px !important;
          }
          
          .word-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .word-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px;
            background: #fafafa;
            border-radius: 8px;
            border: 2px solid transparent;
            transition: all 0.2s ease;
          }
          
          .word-item:hover {
            background: #f5f5f5;
          }
          
          .word-item.selected {
            background: #e8f0fe;
            border-color: #4A90D9;
          }
          
          .word-checkbox {
            padding-top: 2px;
            cursor: pointer;
          }
          
          .word-checkbox input[type="checkbox"] {
            cursor: pointer;
          }
          
          .word-info {
            flex: 1;
            min-width: 0;
          }
          
          .word-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
          }
          
          .word-original {
            font-size: 15px;
            font-weight: 600;
            color: #333;
          }
          
          .word-level {
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
          }
          
          .word-level.level-1 {
            background: #e8f5e9;
            color: #4CAF50;
          }
          
          .word-level.level-2 {
            background: #fff3e0;
            color: #FF9800;
          }
          
          .word-level.level-3 {
            background: #fce4ec;
            color: #e91e63;
          }
          
          .word-level.level-4 {
            background: #f3e5f5;
            color: #9c27b0;
          }
          
          .word-level.level-5 {
            background: #e8eaf6;
            color: #3f51b5;
          }
          
          .word-simplified {
            font-size: 13px;
            color: #4A90D9;
            margin-bottom: 2px;
          }
          
          .word-definition {
            font-size: 13px;
            color: #666;
            margin-bottom: 4px;
          }
          
          .word-date {
            font-size: 11px;
            color: #999;
          }
          
          .delete-word-btn {
            width: 24px;
            height: 24px;
            border: none;
            background: transparent;
            color: #999;
            font-size: 18px;
            cursor: pointer;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          
          .delete-word-btn:hover {
            background: #ffebee;
            color: #f44336;
          }
          
          .drawer-content::-webkit-scrollbar {
            width: 6px;
          }
          
          .drawer-content::-webkit-scrollbar-track {
            background: #f1f1f1;
          }
          
          .drawer-content::-webkit-scrollbar-thumb {
            background: #ddd;
            border-radius: 3px;
          }
          
          .drawer-content::-webkit-scrollbar-thumb:hover {
            background: #bbb;
          }
        `}</style>
      </div>
    </>
  );
};
