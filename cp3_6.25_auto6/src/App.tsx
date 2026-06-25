import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Book, Reader, BorrowRecord, FineStats } from './types';
import { getBooks, borrowBook, returnBook, getFineStats, resetData } from './api';
import BookList from './components/BookList';
import BorrowForm from './components/BorrowForm';
import ReturnForm from './components/ReturnForm';
import FineStatsComponent from './components/FineStats';
import BorrowHistory from './components/BorrowHistory';
import dayjs from 'dayjs';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [borrowLoading, setBorrowLoading] = useState(false);

  const [returnLoading, setReturnLoading] = useState(false);
  const [fineModal, setFineModal] = useState<{ visible: boolean; fine: number; record: BorrowRecord | null }>({
    visible: false,
    fine: 0,
    record: null
  });

  const [stats, setStats] = useState<FineStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState('');

  const loadBooks = useCallback(async () => {
    setBooksLoading(true);
    setBooksError(null);
    try {
      const data = await getBooks();
      setBooks(data);
    } catch (err) {
      setBooksError('数据加载失败，请稍后重试');
    } finally {
      setBooksLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await getFineStats();
      setStats(data);
    } catch (err) {
      setStatsError('数据加载失败，请稍后重试');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
    loadStats();
  }, [loadBooks, loadStats]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleBorrowClick = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (book) {
      setSelectedBook(book);
    }
  };

  const handleBorrowSubmit = async (reader: Reader) => {
    if (!selectedBook) return;
    setBorrowLoading(true);
    try {
      const record = await borrowBook(selectedBook.id, reader);
      setSelectedBook(null);
      loadBooks();
      loadStats();
      showSuccess(`借阅成功！预计归还日期：${dayjs(record.dueDate).format('YYYY-MM-DD')}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '借阅失败');
    } finally {
      setBorrowLoading(false);
    }
  };

  const handleReturn = async (recordId: string) => {
    setReturnLoading(true);
    try {
      const result = await returnBook(recordId);
      setFineModal({ visible: true, fine: result.fine, record: result.record });
      loadBooks();
      loadStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : '归还失败');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleFineModalClose = () => {
    setFineModal({ visible: false, fine: 0, record: null });
  };

  const handleReset = async () => {
    try {
      await resetData();
      loadBooks();
      loadStats();
      showSuccess('数据已重置');
    } catch (err) {
      alert(err instanceof Error ? err.message : '重置失败');
    }
  };

  const navItems = [
    { path: '/', label: '书籍列表', icon: '📚' },
    { path: '/return', label: '归还书籍', icon: '↩️' },
    { path: '/history', label: '借阅历史', icon: '📋' },
    { path: '/stats', label: '统计看板', icon: '📊' }
  ];

  const currentPath = location.pathname;

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-title">社区图书馆</div>
        {navItems.map((item) => (
          <div
            key={item.path}
            className={`nav-item ${currentPath === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </aside>

      <main className="content">
        {successMessage && (
          <div style={{
            background: '#e8f5e9',
            color: '#2e7d32',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #c8e6c9'
          }}>
            {successMessage}
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <BookList
                books={books}
                loading={booksLoading}
                error={booksError}
                onBorrow={handleBorrowClick}
              />
            }
          />
          <Route
            path="/return"
            element={
              <ReturnForm
                onReturn={handleReturn}
                loading={returnLoading}
              />
            }
          />
          <Route path="/history" element={<BorrowHistory />} />
          <Route
            path="/stats"
            element={
              <FineStatsComponent
                stats={stats}
                loading={statsLoading}
                error={statsError}
                onReset={handleReset}
              />
            }
          />
        </Routes>
      </main>

      <BorrowForm
        book={selectedBook}
        onSubmit={handleBorrowSubmit}
        onCancel={() => setSelectedBook(null)}
        loading={borrowLoading}
      />

      {fineModal.visible && (
        <div className="modal-overlay" onClick={handleFineModalClose}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">归还成功</h2>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                {fineModal.record && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>{fineModal.record.bookTitle}</strong>
                  </div>
                )}
                滞纳金金额
              </div>
              <div className="fine-amount">¥{fineModal.fine.toFixed(2)}</div>
              <div style={{ textAlign: 'center', fontSize: '13px', color: '#757575' }}>
                {fineModal.fine > 0 ? '请前往服务台缴纳滞纳金' : '无滞纳金，感谢您按时归还'}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleFineModalClose}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
