import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import BookList from './pages/BookList';
import NoteEditor from './pages/NoteEditor';
import GraphPage from './pages/GraphPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <nav className="nav-bar">
        <NavLink to="/books" className="logo">📚 阅读笔记图谱</NavLink>
        <div className="nav-links">
          <NavLink to="/books" className={({ isActive }) => isActive ? 'active' : ''}>书籍列表</NavLink>
          <NavLink to="/graph" className={({ isActive }) => isActive ? 'active' : ''}>知识图谱</NavLink>
          <NavLink to="/search" className={({ isActive }) => isActive ? 'active' : ''}>搜索</NavLink>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<BookList />} />
        <Route path="/books" element={<BookList />} />
        <Route path="/book/:id" element={<NoteEditor />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </BrowserRouter>
  );
};

const SearchPage: React.FC = () => {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<{ books: any[]; notes: any[] } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  const doSearch = React.useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      setResults(await res.json());
    } catch { setResults(null); }
    setLoading(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 200);
  };

  const highlightText = (text: string, kw: string) => {
    if (!kw) return text;
    const re = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(re);
    return parts.map((p, i) => re.test(p) ? <span key={i} className="highlight">{p}</span> : p);
  };

  const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '');

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">搜索</h1>
      </div>
      <div className="search-box" style={{ width: '100%', maxWidth: 480, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="搜索书名、作者或笔记内容..."
          value={query}
          onChange={handleChange}
        />
        <span className="search-icon">🔍</span>
      </div>
      {loading && <p style={{ color: 'var(--text-light)' }}>搜索中...</p>}
      {results && (
        <div>
          {results.books.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 12 }}>匹配书籍 ({results.books.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.books.map((b: any) => (
                  <a key={b.id} href={`/book/${b.id}`} style={{ display: 'block', padding: 14, background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', backdropFilter: 'blur(6px)' }}>
                    <strong>{highlightText(b.title, query)}</strong>
                    <span style={{ marginLeft: 8, color: 'var(--text-light)', fontSize: 13 }}>{highlightText(b.author, query)}</span>
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)' }}>{b.reading_status === 'read' ? '已读' : b.reading_status === 'reading' ? '在读' : '未读'}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {results.notes.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 12 }}>匹配笔记 ({results.notes.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.notes.map((n: any) => (
                  <a key={n.id} href={`/book/${n.book_id}`} style={{ display: 'block', padding: 14, background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', backdropFilter: 'blur(6px)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>《{n.book_title}》</div>
                    <div style={{ fontSize: 14 }}>{highlightText(stripHtml(n.content).slice(0, 150), query)}</div>
                    {n.tags && n.tags.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {n.tags.map((t: any) => <span key={t.id} className={`tag-chip cat-${t.category}`}>{t.name}</span>)}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
          {results.books.length === 0 && results.notes.length === 0 && (
            <div className="empty-state"><p>未找到匹配结果</p></div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
