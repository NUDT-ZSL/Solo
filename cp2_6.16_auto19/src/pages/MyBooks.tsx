import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { booksAPI } from '../services/api';
import { Book } from '../types';
import BookCard from '../components/BookCard';
import BookModal, { BookFormData } from '../components/BookModal';
import { useAuth } from '../context/AuthContext';
import './MyBooks.css';

export default function MyBooks() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user) {
      fetchBooks();
    }
  }, [user, isAuthenticated]);

  const fetchBooks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await booksAPI.getByUser(user.id);
      setBooks(data);
    } catch (err) {
      console.error('获取我的图书失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBook = async (data: BookFormData) => {
    if (!user) return;
    try {
      const newBook = await booksAPI.create({
        owner_id: user.id,
        title: data.title,
        author: data.author,
        tags: data.tags,
        condition: data.condition,
        image_url: data.image,
      });
      setBooks([newBook, ...books]);
    } catch (err) {
      console.error('创建图书失败', err);
      alert('发布失败，请重试');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>
          <i className="fas fa-book" style={{ color: '#ff6b35' }}></i>
          我的发布
        </h1>
        <p className="page-subtitle">管理你发布的所有图书</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>加载中...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="empty-state my-books-empty">
          <i className="fas fa-book-open"></i>
          <h3>还没有发布图书</h3>
          <p>点击右下角的按钮，发布你的第一本书吧</p>
          <button
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
          >
            <i className="fas fa-plus"></i>
            发布新书
          </button>
        </div>
      ) : (
        <div className="masonry">
          {books.map((book, index) => (
            <BookCard
              key={book.id}
              book={book}
              delay={index * 50}
            />
          ))}
        </div>
      )}

      <button
        className="fab-btn"
        onClick={() => setModalOpen(true)}
      >
        <i className="fas fa-plus"></i>
      </button>

      <BookModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateBook}
      />
    </div>
  );
}
