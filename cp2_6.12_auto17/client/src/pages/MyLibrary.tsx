import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Book } from '../types';
import { useUser } from '../context/UserContext';
import { useSocket } from '../context/SocketContext';
import BookCard from '../components/BookCard';

type TabType = 'published' | 'received';

const MyLibrary: React.FC = () => {
  const [publishedBooks, setPublishedBooks] = useState<Book[]>([]);
  const [receivedBooks, setReceivedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('published');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBookId, setNewBookId] = useState<string | null>(null);
  const { currentUser } = useUser();
  const { addNotification } = useSocket();

  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    coverUrl: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const [publishedRes, exchangesRes] = await Promise.all([
        axios.get('/api/books', { params: { userId: currentUser.id, limit: 100 } }),
        axios.get('/api/exchanges', { params: { userId: currentUser.id } }),
      ]);

      setPublishedBooks(publishedRes.data.books);

      const acceptedExchanges = exchangesRes.data.filter(
        (e: any) => e.status === 'accepted' && e.toUserId === currentUser.id
      );
      const received = acceptedExchanges
        .filter((e: any) => e.book)
        .map((e: any) => e.book);
      setReceivedBooks(received);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author) {
      addNotification('请填写书名和作者', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('/api/books', {
        ...newBook,
        userId: currentUser.id,
      });
      setNewBookId(response.data.id);
      setTimeout(() => setNewBookId(null), 500);
      addNotification('图书上架成功！', 'success');
      setShowAddModal(false);
      setNewBook({ title: '', author: '', isbn: '', coverUrl: '', description: '' });
      fetchBooks();
    } catch (error) {
      addNotification('上架失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookDeleted = (bookId: string) => {
    setPublishedBooks((prev) => prev.filter((b) => b.id !== bookId));
    addNotification('图书已下架', 'success');
  };

  const displayBooks = activeTab === 'published' ? publishedBooks : receivedBooks;

  return (
    <div>
      <h1 className="page-title">我的图书馆</h1>

      <div className="library-tabs">
        <button
          className={`library-tab ${activeTab === 'published' ? 'active' : ''}`}
          onClick={() => setActiveTab('published')}
        >
          已发布 ({publishedBooks.length})
        </button>
        <button
          className={`library-tab ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          已收到 ({receivedBooks.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : displayBooks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {activeTab === 'published' ? '📚' : '📬'}
          </div>
          <p className="empty-state-text">
            {activeTab === 'published'
              ? '还没有发布图书，点击右下角按钮上架第一本书吧！'
              : '还没有收到交换的图书'}
          </p>
        </div>
      ) : (
        <div className="books-grid">
          {displayBooks.map((book, index) => (
            <BookCard
              key={book.id}
              book={book}
              showDelete={activeTab === 'published'}
              onDeleted={() => handleBookDeleted(book.id)}
              animationDelay={index * 50}
              isNew={book.id === newBookId}
            />
          ))}
        </div>
      )}

      {activeTab === 'published' && (
        <button className="add-book-btn" onClick={() => setShowAddModal(true)}>
          +
        </button>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">上架新书</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">书名 *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    placeholder="请输入书名"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">作者 *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    placeholder="请输入作者"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ISBN</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    placeholder="请输入ISBN（可选）"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">封面图片URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newBook.coverUrl}
                    onChange={(e) => setNewBook({ ...newBook, coverUrl: e.target.value })}
                    placeholder="请输入封面图片链接（可选）"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">简短描述</label>
                  <textarea
                    className="form-input form-textarea"
                    value={newBook.description}
                    onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                    placeholder="请输入图书描述（可选）"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? '上架中...' : '确认上架'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLibrary;
