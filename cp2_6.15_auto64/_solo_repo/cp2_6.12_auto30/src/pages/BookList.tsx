import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BookCard from '../components/BookCard';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  reading_status: 'unread' | 'reading' | 'read';
  note_count: number;
}

const BookList: React.FC = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', author: '', cover_url: '', reading_status: 'unread' as Book['reading_status'] });
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [closing, setClosing] = useState(false);

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books');
      setBooks(await res.json());
    } catch { }
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ title: '', author: '', cover_url: '', reading_status: 'unread' });
    setShowForm(false);
    fetchBooks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此书籍及其所有笔记？')) return;
    await fetch(`/api/books/${id}`, { method: 'DELETE' });
    fetchBooks();
  };

  const handleExport = async () => {
    setExporting(true);
    setExportProgress(0);
    const total = 30;
    for (let i = 0; i <= total; i++) {
      await new Promise(r => setTimeout(r, 30));
      setExportProgress(Math.round((i / total) * 100));
    }
    try {
      const res = await fetch('/api/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'notes_export.md';
      a.click();
      URL.revokeObjectURL(url);
    } catch { }
    setExporting(false);
    setExportProgress(0);
  };

  const filtered = books
    .filter(b => filter === 'all' || b.reading_status === filter)
    .filter(b => !search || b.title.includes(search) || b.author.includes(search));

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">我的书架</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>＋ 添加书籍</button>
          <button className="btn btn-secondary" onClick={handleExport}>📥 导出笔记</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-box" style={{ width: 260 }}>
          <input type="text" placeholder="搜索书名或作者..." value={search} onChange={e => setSearch(e.target.value)} />
          <span className="search-icon">🔍</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all', label: '全部' },
            { key: 'unread', label: '未读' },
            { key: 'reading', label: '在读' },
            { key: 'read', label: '已读' },
          ].map(f => (
            <button
              key={f.key}
              className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>{books.length === 0 ? '书架空空如也，添加第一本书吧' : '没有匹配的书籍'}</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20,
        }}>
          {filtered.map(book => (
            <div key={book.id} style={{ position: 'relative' }}>
              <BookCard
                {...book}
                onClick={() => navigate(`/book/${book.id}`)}
              />
              <button
                className="btn btn-ghost btn-sm"
                style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.6, padding: '2px 8px', fontSize: 11 }}
                onClick={e => { e.stopPropagation(); handleDelete(book.id); }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => { setClosing(true); setTimeout(() => { setShowForm(false); setClosing(false); }, 200); }}>
          <div className={`modal-content ${closing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">添加书籍</h3>
            <div className="form-group">
              <label>书名 *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="输入书名" />
            </div>
            <div className="form-group">
              <label>作者</label>
              <input type="text" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="输入作者" />
            </div>
            <div className="form-group">
              <label>封面 URL</label>
              <input type="text" value={form.cover_url} onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>阅读状态</label>
              <select value={form.reading_status} onChange={e => setForm(f => ({ ...f, reading_status: e.target.value as Book['reading_status'] }))}>
                <option value="unread">未读</option>
                <option value="reading">在读</option>
                <option value="read">已读</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!form.title.trim()}>创建</button>
            </div>
          </div>
        </div>
      )}

      {exporting && (
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal-content" style={{ textAlign: 'center', padding: 32 }}>
            <div className="progress-ring-container">
              <svg width="80" height="80">
                <circle className="progress-ring-bg" cx="40" cy="40" r="34" />
                <circle
                  className="progress-ring-fg"
                  cx="40"
                  cy="40"
                  r="34"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - exportProgress / 100)}`}
                />
              </svg>
              <span style={{ fontSize: 14, color: 'var(--text-light)' }}>{exportProgress}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookList;
