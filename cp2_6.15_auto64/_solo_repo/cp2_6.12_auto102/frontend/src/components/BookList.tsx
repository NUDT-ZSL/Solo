import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext, Book, Reservation } from '../context/AppContext';
import './BookList.css';

const BookList: React.FC = () => {
  const { user, fetchReservations } = useAppContext();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isReserving, setIsReserving] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchBooks();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/books/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (error) {
      console.error('获取分类失败', error);
    }
  };

  const fetchBooks = async () => {
    setIsSearching(true);
    try {
      const res = await axios.get('/api/books', {
        params: { q: searchTerm, category: selectedCategory }
      });
      if (res.data.success) {
        setBooks(res.data.data);
      }
    } catch (error) {
      console.error('获取图书列表失败', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReserve = async () => {
    if (!selectedBook || !user || !pickupDate) return;
    
    setIsReserving(true);
    try {
      const res = await axios.post('/api/books/reserve', {
        book_id: selectedBook.id,
        user_id: user.id,
        pickup_date: pickupDate
      });
      if (res.data.success) {
        alert('预约成功！请在取书日期前到馆取书。');
        setShowReserveModal(false);
        setPickupDate('');
        fetchBooks();
        fetchReservations();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '预约失败');
    } finally {
      setIsReserving(false);
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="status-dot available" title="在馆" />;
      case 'borrowed':
        return <span className="status-dot borrowed" title="已借出" />;
      case 'reserved':
        return <span className="status-dot reserved" title="已预约" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return '在馆';
      case 'borrowed': return '已借出';
      case 'reserved': return '已预约';
      default: return status;
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="book-list-page">
      <div className="page-header">
        <h1 className="page-title">图书检索</h1>
        <p className="page-subtitle">搜索和预约您想阅读的图书</p>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索书名、作者或ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-select"
        >
          <option value="">全部分类</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {isSearching ? (
        <div className="loading">搜索中...</div>
      ) : (
        <>
          <div className="results-count">
            找到 <strong>{books.length}</strong> 本图书
          </div>

          <div className="books-grid">
            <AnimatePresence>
              {books.map((book, index) => (
                <motion.div
                  key={book.id}
                  className="book-card"
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => setSelectedBook(book)}
                >
                  <div className="book-cover">
                    <span className="book-emoji">{book.cover_emoji}</span>
                  </div>
                  <div className="book-info">
                    <h3 className="book-title">{book.title}</h3>
                    <p className="book-author">{book.author}</p>
                    <div className="book-bottom">
                      <span className="book-category">{book.category}</span>
                      <div className="book-status">
                        {getStatusDot(book.status)}
                        <span className="status-text">{getStatusText(book.status)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {books.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>没有找到匹配的图书</p>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {selectedBook && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBook(null)}
          >
            <motion.div
              className="modal-content book-detail-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setSelectedBook(null)}>×</button>
              
              <div className="book-detail-header">
                <div className="book-detail-cover">
                  <span className="book-emoji-large">{selectedBook.cover_emoji}</span>
                </div>
                <div className="book-detail-meta">
                  <h2 className="book-detail-title">{selectedBook.title}</h2>
                  <p className="book-detail-author">作者：{selectedBook.author}</p>
                  <div className="book-detail-status-row">
                    {getStatusDot(selectedBook.status)}
                    <span>{getStatusText(selectedBook.status)}</span>
                  </div>
                </div>
              </div>

              <div className="book-detail-body">
                <div className="detail-section">
                  <h4>出版信息</h4>
                  <p><span className="detail-label">出版社：</span>{selectedBook.publisher}</p>
                  <p><span className="detail-label">出版日期：</span>{selectedBook.publish_date}</p>
                  <p><span className="detail-label">ISBN：</span>{selectedBook.isbn}</p>
                  <p><span className="detail-label">馆藏位置：</span>{selectedBook.location}</p>
                  <p><span className="detail-label">分类：</span>{selectedBook.category}</p>
                </div>
                <div className="detail-section">
                  <h4>内容简介</h4>
                  <p className="book-description">{selectedBook.description}</p>
                </div>
              </div>

              <div className="book-detail-actions">
                {selectedBook.status === 'available' && (
                  <button 
                    className="btn-primary"
                    onClick={() => setShowReserveModal(true)}
                  >
                    📅 预约图书
                  </button>
                )}
                <button 
                  className="btn-primary"
                  onClick={() => {
                    localStorage.setItem('currentBook', JSON.stringify(selectedBook));
                    window.location.hash = '#/reading';
                    window.dispatchEvent(new CustomEvent('startReading', { detail: selectedBook }));
                  }}
                >
                  ⏱️ 开始阅读
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReserveModal && selectedBook && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReserveModal(false)}
          >
            <motion.div
              className="modal-content reserve-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="modal-title">预约图书</h3>
              <p className="modal-subtitle">《{selectedBook.title}》</p>
              
              <div className="form-group">
                <label>选择取书日期</label>
                <input
                  type="date"
                  value={pickupDate}
                  min={minDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowReserveModal(false)}
                  disabled={isReserving}
                >
                  取消
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleReserve}
                  disabled={!pickupDate || isReserving}
                >
                  {isReserving ? '提交中...' : '确认预约'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookList;
