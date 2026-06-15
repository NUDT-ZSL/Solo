import React, { useEffect, useState } from 'react';
import { Book, searchBooks, addBook } from '../client/books';

interface LibraryProps {
  userId: string;
  username: string;
  avatar: string;
  onBookClick: (id: string) => void;
}

const Library: React.FC<LibraryProps> = ({ userId, username, avatar, onBookClick }) => {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: '', author: '', pages: 0, rating: 7.0, description: '',
  });

  const load = async () => {
    const list = await searchBooks(query);
    setBooks(list);
  };

  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [query]);

  const handleAdd = async () => {
    if (!form.title || !form.author) return;
    await addBook(form, userId, username, avatar);
    setForm({ title: '', author: '', pages: 0, rating: 7.0, description: '' });
    setShowAdd(false);
    await load();
  };

  return (
    <div>
      <h1 className="page-title">📚 俱乐部书库</h1>

      <div className="search-bar">
        <input
          className="search-input"
          placeholder="🔍 搜索书名或作者..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ 添加图书</button>
      </div>

      <div className="book-grid">
        {books.map((b) => (
          <div key={b._id} className="card card-hover book-card" onClick={() => onBookClick(b._id)}>
            <img src={b.cover} alt={b.title} className="book-cover" />
            <div className="book-info">
              <div className="book-title">{b.title}</div>
              <div className="book-author">{b.author}</div>
              <div className="book-meta">
                <span className="book-pages">{b.pages}页</span>
                <span className="book-rating">⭐ {b.rating}</span>
              </div>
            </div>
          </div>
        ))}
        {books.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#a08a74' }}>暂无图书，请先添加</div>}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">➕ 添加图书到书库</div>
            <div className="form-group">
              <label>书名*</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label>作者*</label>
              <input className="form-input" value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>页数</label>
                <input type="number" className="form-input" value={form.pages} onChange={(e) => setForm((p) => ({ ...p, pages: Number(e.target.value) }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>豆瓣评分</label>
                <input type="number" step="0.1" className="form-input" value={form.rating} onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label>简介</label>
              <textarea className="form-input" style={{ minHeight: '80px' }} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn-primary" onClick={handleAdd}>添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
