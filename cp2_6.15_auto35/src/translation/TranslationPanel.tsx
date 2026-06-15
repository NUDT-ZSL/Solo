import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { TranslationItem, TranslationPagination } from '../types';

interface TranslationPanelProps {
  projectId: string;
  onProgressUpdate: () => void;
  onSelectText: (text: string) => void;
}

export default function TranslationPanel({
  projectId, onProgressUpdate, onSelectText
}: TranslationPanelProps) {
  const [pagination, setPagination] = useState<TranslationPagination>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 60
  });
  const [localTranslations, setLocalTranslations] = useState<Map<string, string>>(new Map());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set());
  const [checkmarkIds, setCheckmarkIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    if (projectId && pagination.page) {
      loadTranslations();
    }
  }, [projectId, pagination.page]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (focusedId && localTranslations.has(focusedId)) {
          handleSave(focusedId, localTranslations.get(focusedId) || '');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedId, localTranslations]);

  const loadTranslations = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/translations`, {
        params: {
          page: pagination.page,
          pageSize: pagination.pageSize
        }
      });
      setPagination(response.data);
      initialLocalTranslations(response.data.items);
    } catch (error) {
        console.error('Failed to load translations:', error);
      }
  };

  const initialLocalTranslations = (items: TranslationItem[]) => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      map.set(item.id, item.translatedText || '');
    });
    setLocalTranslations(map);
  };

  const handleTranslationChange = (id: string, value: string) => {
    const newMap = new Map(localTranslations);
    newMap.set(id, value);
    setLocalTranslations(newMap);
    onSelectText(value);
  };

  const handleSave = useCallback(async (id: string, translatedText: string) => {
    if (savingIds.has(id)) return;

    setSavingIds((prev) => new Set(prev).add(id));

    try {
      await axios.put(`/api/translations/${id}`, { translatedText });

      setCheckmarkIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setCheckmarkIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);

      setFlashingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setFlashingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 500);

      setPagination((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id
            ? { ...item, translatedText, status: translatedText.trim() ? 'translated' : 'pending' }
            : item
        )
      }));

      onProgressUpdate();
    } catch (error) {
      console.error('Failed to save translation:', error);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [savingIds, onProgressUpdate]);

  const handleBlur = (id: string) => {
    const currentText = localTranslations.get(id) || '';
    const originalItem = pagination.items.find((i) => i.id === id);
    if (originalItem && currentText !== originalItem.translatedText) {
      handleSave(id, currentText);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  const renderPageButtons = () => {
    const buttons: JSX.Element[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`pagination-btn ${pagination.page === i ? 'active' : ''}`}
          onClick={() => setPagination((prev) => ({ ...prev, page: i }))}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  const translatedCount = pagination.items.filter(
    (item) => item.status === 'translated'
  ).length;

  return (
    <div className="translation-panel">
      <div className="panel-header">
        <div className="panel-title">文本条目</div>
        <div className="panel-stats">
          本页已翻译 {translatedCount} / {pagination.items.length}
          {pagination.total > 0 && ` · 共 ${pagination.total} 条`}
        </div>
      </div>

      <table className="translation-table">
        <thead className="table-header">
          <tr>
            <th style={{ width: '60px' }}>#</th>
            <th style={{ width: '100px' }}>分类</th>
            <th style={{ width: '40%' }}>原文</th>
            <th>译文</th>
            <th style={{ width: '100px' }}>状态</th>
          </tr>
        </thead>
        <tbody>
          {pagination.items.map((item, index) => (
            <tr
              key={item.id}
              className={`translation-row ${flashingIds.has(item.id) ? 'flash' : ''}`}
            >
              <td>{(pagination.page - 1) * pagination.pageSize + index + 1}</td>
              <td>
                <span className="category-tag">{item.category}</span>
              </td>
              <td>
                <div className="source-text" title={item.sourceText}>
                  {item.sourceText}
                </div>
              </td>
              <td className="translation-input-cell">
                <input
                  type="text"
                  className="translation-input"
                  value={localTranslations.get(item.id) || ''}
                  onChange={(e) => handleTranslationChange(item.id, e.target.value)}
                  onFocus={() => {
                    setFocusedId(item.id);
                    onSelectText(localTranslations.get(item.id) || item.sourceText);
                  }}
                  onBlur={() => handleBlur(item.id)}
                  placeholder="请输入译文..."
                />
                {checkmarkIds.has(item.id) && (
                  <span className="save-checkmark show">✓</span>
                )}
              </td>
              <td>
                <span className={`status-badge status-${item.status}`}>
                  {item.status === 'translated' ? '已翻译' : '待翻译'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
          >
            上一页
          </button>
          {pagination.page > 3 && totalPages > 5 && (
            <>
              <button
                className="pagination-btn"
                onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))}
              >
                1
              </button>
              {pagination.page > 4 && <span>...</span>}
            </>
          )}
          {renderPageButtons()}
          {pagination.page < totalPages - 2 && totalPages > 5 && (
            <>
              {pagination.page < totalPages - 3 && <span>...</span>}
              <button
                className="pagination-btn"
                onClick={() => setPagination((prev) => ({ ...prev, page: totalPages }))}
              >
                {totalPages}
              </button>
            </>
          )}
          <button
            className="pagination-btn"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === totalPages}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
