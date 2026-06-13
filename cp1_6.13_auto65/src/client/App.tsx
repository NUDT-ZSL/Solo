import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import BookList from './BookList';
import AddBookForm from './AddBookForm';
import BookTrail from './BookTrail';
import Profile from './Profile';

export interface User {
  _id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  coverUrl: string;
  isbn: string;
  ownerName: string;
  ownerId: string;
  currentHolder: string;
  currentHolderName: string;
  status: 'available' | 'borrowed';
  borrowedAt: string | null;
  dueDate: string | null;
  qrCode: string;
  createdAt: string;
}

const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.5); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes checkPop {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
  .page-container { animation: fadeIn 0.3s ease forwards; min-height: 100vh; }
  .nav-bar {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 0 24px;
    height: 60px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .nav-gradient {
    height: 3px;
    background: linear-gradient(90deg, #f97316, #fbbf24);
  }
  .nav-logo {
    font-size: 22px; font-weight: 700;
    background: linear-gradient(135deg, #f97316, #ea580c);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-decoration: none;
  }
  .nav-links { display: flex; gap: 20px; align-items: center; }
  .nav-link {
    text-decoration: none; color: #374151; font-size: 15px; font-weight: 500;
    padding: 6px 12px; border-radius: 8px;
    transition: all 0.3s ease;
  }
  .nav-link:hover { background: #fef3c7; color: #f97316; }
  .nav-link.active { background: #fef3c7; color: #f97316; }
  .btn-primary {
    background: linear-gradient(135deg, #f97316, #ea580c);
    color: #fff; border: none; padding: 10px 24px;
    border-radius: 10px; font-size: 15px; font-weight: 600;
    cursor: pointer; transition: all 0.3s ease;
    display: inline-flex; align-items: center; gap: 8px;
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(249,115,22,0.3); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
  .btn-outline {
    background: #fff; color: #f97316; border: 2px solid #f97316;
    padding: 8px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.3s ease;
  }
  .btn-outline:hover { background: #fff7ed; }
  .spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  .checkmark-icon {
    display: inline-block;
    animation: checkPop 0.4s ease forwards;
  }
`;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/books');
      setBooks(res.data);
    } catch (err) {
      console.error('Failed to fetch books', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('booktrail_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
    fetchBooks();
  }, [fetchBooks]);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('booktrail_user', JSON.stringify(u));
    navigate('/');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('booktrail_user');
    navigate('/');
  };

  const handleAddBook = async (data: { title: string; author: string; coverUrl: string; isbn: string }) => {
    const res = await axios.post('/api/books', {
      ...data,
      ownerName: user?.name || '',
      ownerId: user?._id || '',
    });
    setBooks((prev) => [res.data, ...prev]);
    return res.data;
  };

  const handleBorrow = async (bookId: string) => {
    if (!user) return;
    const res = await axios.put('/api/books/borrow', {
      bookId,
      borrowerId: user._id,
      borrowerName: user.name,
      lenderId: '',
      lenderName: '',
    });
    setBooks((prev) => prev.map((b) => (b._id === bookId ? res.data : b)));
  };

  const handleReturn = async (bookId: string) => {
    if (!user) return;
    const res = await axios.put('/api/books/return', {
      bookId,
      returnerId: user._id,
    });
    setBooks((prev) => prev.map((b) => (b._id === bookId ? res.data : b)));
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <style>{styles}</style>
      <nav className="nav-bar">
        <Link to="/" className="nav-logo">📚 BookTrail</Link>
        <div className="nav-links">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>首页</Link>
          <Link to="/books" className={`nav-link ${isActive('/books') ? 'active' : ''}`}>书架</Link>
          {user ? (
            <>
              <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>个人中心</Link>
              <button onClick={handleLogout} className="btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }}>
                退出
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
              登录
            </Link>
          )}
        </div>
      </nav>
      <div className="nav-gradient" />
      <div className="page-container" style={{ background: '#f9fafb' }}>
        <Routes>
          <Route
            path="/"
            element={
              <div className="fade-in" style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                  <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
                    🏘️ 小区共享图书角
                  </h1>
                  <p style={{ color: '#6b7280', fontSize: 16 }}>
                    让好书在邻里间漂流，让知识在社区中传递
                  </p>
                </div>
                <BookList
                  books={books}
                  loading={loading}
                  user={user}
                  onBorrow={handleBorrow}
                  onReturn={handleReturn}
                />
              </div>
            }
          />
          <Route
            path="/books"
            element={
              <div className="fade-in" style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 24 }}>全部图书</h2>
                <BookList
                  books={books}
                  loading={loading}
                  user={user}
                  onBorrow={handleBorrow}
                  onReturn={handleReturn}
                />
              </div>
            }
          />
          <Route
            path="/add"
            element={
              user ? (
                <div className="fade-in" style={{ padding: '32px 24px', maxWidth: 560, margin: '0 auto' }}>
                  <AddBookForm onSubmit={handleAddBook} />
                </div>
              ) : (
                <div className="fade-in" style={{ textAlign: 'center', padding: 80 }}>
                  <p style={{ color: '#6b7280', fontSize: 16 }}>请先登录后添加图书</p>
                  <Link to="/login" className="btn-primary" style={{ marginTop: 16 }}>去登录</Link>
                </div>
              )
            }
          />
          <Route
            path="/trail/:id"
            element={<BookTrail />}
          />
          <Route
            path="/profile"
            element={
              user ? (
                <Profile user={user} onReturn={handleReturn} />
              ) : (
                <div className="fade-in" style={{ textAlign: 'center', padding: 80 }}>
                  <p style={{ color: '#6b7280', fontSize: 16 }}>请先登录查看个人中心</p>
                  <Link to="/login" className="btn-primary" style={{ marginTop: 16 }}>去登录</Link>
                </div>
              )
            }
          />
          <Route
            path="/login"
            element={<AuthPage onLogin={handleLogin} />}
          />
        </Routes>
      </div>
    </>
  );
}

function AuthPage({ onLogin }: { onLogin: (u: User) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        const res = await axios.post('/api/auth/register', { name, phone, address });
        onLogin(res.data.user);
      } else {
        const res = await axios.post('/api/auth/login', { phone });
        onLogin(res.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 63px)', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 8, textAlign: 'center' }}>
          {isRegister ? '注册 BookTrail' : '欢迎回来'}
        </h2>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 28, fontSize: 14 }}>
          {isRegister ? '加入小区共享图书角' : '登录您的账户'}
        </p>
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>姓名</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                required
                placeholder="请输入姓名"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, outline: 'none', transition: 'all 0.3s ease' }}
                onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>手机号</label>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)}
              required type="tel"
              placeholder="请输入手机号"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, outline: 'none', transition: 'all 0.3s ease' }}
              onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          {isRegister && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>小区门牌号</label>
              <input
                value={address} onChange={(e) => setAddress(e.target.value)}
                required
                placeholder="如：A栋3单元501"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, outline: 'none', transition: 'all 0.3s ease' }}
                onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
            {submitting ? <span className="spinner" /> : (isRegister ? '注册' : '登录')}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, color: '#6b7280', fontSize: 14 }}>
          {isRegister ? '已有账号？' : '没有账号？'}
          <span
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{ color: '#f97316', cursor: 'pointer', fontWeight: 600, marginLeft: 4 }}
          >
            {isRegister ? '去登录' : '去注册'}
          </span>
        </p>
      </div>
    </div>
  );
}
