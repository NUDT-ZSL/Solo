import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import NoteCard from '../components/NoteCard';
import { noteApi } from '../api';
import type { Note } from '../types';
import { useToast } from '../context/ToastContext';
import type { SortOrder } from '../types';

const NoteList: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const [notesRes, tagsRes] = await Promise.all([
        noteApi.getNotes({ search, sort: sortOrder, tag: selectedTag || undefined }),
        noteApi.getTags()
      ]);
      setNotes(notesRes.data.notes);
      setAvailableTags(tagsRes.data.tags);
    } catch (err) {
      console.error('加载笔记失败:', err);
      showToast('加载笔记失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, sortOrder, selectedTag, showToast]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNew = useCallback(() => {
    navigate('/note/new');
  }, [navigate]);

  const handleDelete = useCallback(async (note: Note) => {
    try {
      await noteApi.deleteNote(note.id);
      showToast('已移至回收站');
      setNotes(prev => prev.filter(n => n.id !== note.id));
    } catch (err) {
      console.error('删除失败:', err);
      showToast('删除失败', 'error');
    }
  }, [showToast]);

  const handleTagClick = useCallback((tag: string) => {
    setSelectedTag(prev => (prev === tag ? null : tag));
  }, []);

  const clearTagFilter = useCallback(() => {
    setSelectedTag(null);
  }, []);

  const listContent = useMemo(() => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      );
    }

    if (notes.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>还没有笔记</h3>
          <p>
            {search || selectedTag
              ? '没有找到匹配的笔记，试试其他关键词'
              : '点击下方按钮创建你的第一篇手写笔记吧！'}
          </p>
          {!search && !selectedTag && (
            <button className="btn-primary" onClick={handleCreateNew}>
              ✨ 新建笔记
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="notes-grid">
        {notes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            onDelete={handleDelete}
            onTagClick={handleTagClick}
          />
        ))}
      </div>
    );
  }, [loading, notes, search, selectedTag, handleCreateNew, handleDelete, handleTagClick]);

  return (
    <div className="note-list-page">
      <div className="page-header">
        <div className="header-left">
          <div className="title-section">
            <h2 className="page-title">我的笔记</h2>
            <span className="note-count">{notes.length} 篇</span>
          </div>
          {selectedTag && (
            <div className="tag-filter-chip">
              <span>筛选: {selectedTag}</span>
              <button onClick={clearTagFilter} aria-label="清除筛选">✕</button>
            </div>
          )}
        </div>
        <button className="btn-create" onClick={handleCreateNew}>
          <span className="btn-icon">+</span>
          <span className="btn-text">新建笔记</span>
        </button>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <div className="toolbar-right">
          <select
            className="sort-select"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as SortOrder)}
          >
            <option value="desc">最近修改 ↓</option>
            <option value="asc">最早修改 ↑</option>
          </select>
        </div>
      </div>

      <div className="tags-filter-bar">
        {availableTags.map(tag => {
          const count = notes.filter(n => n.tags.includes(tag)).length;
          if (count === 0 && !selectedTag) return null;
          return (
            <button
              key={tag}
              className={`tag-chip ${selectedTag === tag ? 'tag-chip-active' : ''}`}
              onClick={() => handleTagClick(tag)}
            >
              {tag}
              <span className="tag-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="page-content">{listContent}</div>
    </div>
  );
};

export default NoteList;
