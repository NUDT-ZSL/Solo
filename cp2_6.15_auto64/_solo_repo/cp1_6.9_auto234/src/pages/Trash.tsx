import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SearchBar from '../components/SearchBar';
import NoteCard from '../components/NoteCard';
import { noteApi } from '../api';
import type { TrashNote } from '../types';
import { useToast } from '../context/ToastContext';

const Trash: React.FC = () => {
  const { showToast } = useToast();
  const [trash, setTrash] = useState<TrashNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  const fetchTrash = useCallback(async () => {
    try {
      setLoading(true);
      const res = await noteApi.getTrash({ search });
      setTrash(res.data.trash);
    } catch (err) {
      console.error('加载回收站失败:', err);
      showToast('加载回收站失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = useCallback(async (note: TrashNote) => {
    try {
      await noteApi.restoreNote(note.id);
      showToast('笔记已恢复');
      setTrash(prev => prev.filter(n => n.id !== note.id));
    } catch (err) {
      console.error('恢复失败:', err);
      showToast('恢复失败', 'error');
    }
  }, [showToast]);

  const handlePermanentDelete = useCallback(async (note: TrashNote) => {
    try {
      await noteApi.permanentDelete(note.id);
      showToast('已永久删除');
      setTrash(prev => prev.filter(n => n.id !== note.id));
    } catch (err) {
      console.error('删除失败:', err);
      showToast('删除失败', 'error');
    }
  }, [showToast]);

  const handleEmptyTrash = useCallback(async () => {
    try {
      await noteApi.emptyTrash();
      showToast('回收站已清空');
      setTrash([]);
    } catch (err) {
      console.error('清空失败:', err);
      showToast('清空失败', 'error');
    } finally {
      setShowEmptyConfirm(false);
    }
  }, [showToast]);

  const listContent = useMemo(() => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      );
    }

    if (trash.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">🗑️</div>
          <h3>回收站是空的</h3>
          <p>{search ? '没有找到匹配的已删除笔记' : '删除的笔记将在这里显示'}</p>
        </div>
      );
    }

    return (
      <div className="notes-grid">
        {trash.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            isTrash
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
          />
        ))}
      </div>
    );
  }, [loading, trash, search, handleRestore, handlePermanentDelete]);

  return (
    <div className="trash-page">
      <div className="page-header trash-header">
        <div className="header-left">
          <div className="title-section">
            <h2 className="page-title">
              <span>🗑️</span> 回收站
            </h2>
            <span className="note-count">{trash.length} 篇</span>
          </div>
        </div>
        {trash.length > 0 && (
          <button
            className="btn-danger"
            onClick={() => setShowEmptyConfirm(true)}
          >
            清空回收站
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="搜索已删除的笔记..." />
        </div>
      </div>

      {trash.length > 0 && (
        <div className="trash-notice">
          ⚠️ 回收站中的笔记将被永久保留，手动删除后不可恢复
        </div>
      )}

      <div className="page-content">{listContent}</div>

      {showEmptyConfirm && (
        <div className="confirm-overlay" onClick={() => setShowEmptyConfirm(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h4>确认清空回收站？</h4>
            <p>此操作将永久删除所有 {trash.length} 篇笔记，不可恢复。</p>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setShowEmptyConfirm(false)}>
                取消
              </button>
              <button className="confirm-ok confirm-danger" onClick={handleEmptyTrash}>
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trash;
