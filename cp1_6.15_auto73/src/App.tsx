import { useState, useEffect, useMemo, useCallback } from 'react';
import { Book, BookCategory, BorrowRecord } from './types';
import {
  searchBooks,
  getRecommendations,
  getBookBorrowHistory,
  getCustomerById,
  getStatusLabel
} from './store';
import BookList from './components/BookList';
import BorrowPanel from './components/BorrowPanel';
import RecommendBar from './components/RecommendBar';

type PageType = 'home' | 'borrow';

const CATEGORIES: (BookCategory | 'all')[] = ['all', '文学', '社科', '科普', '少儿'];

const App = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BookCategory | 'all'>('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [listTransitioning, setListTransitioning] = useState(false);
  const [showRecommendInDetail, setShowRecommendInDetail] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const filteredBooks = useMemo(() => {
    return searchBooks(debouncedKeyword, selectedCategory);
  }, [debouncedKeyword, selectedCategory]);

  const handleCategoryChange = useCallback((category: BookCategory | 'all') => {
    if (category === selectedCategory) return;
    setListTransitioning(true);
    setTimeout(() => {
      setSelectedCategory(category);
      setListTransitioning(false);
    }, 300);
  }, [selectedCategory]);

  const handleBookClick = useCallback((book: Book) => {
    setSelectedBook(book);
    setShowDetail(true);
    setShowRecommendInDetail(false);
  }, []);

  const closeDetail = useCallback(() => {
    setShowDetail(false);
    setTimeout(() => {
      setSelectedBook(null);
      setShowRecommendInDetail(false);
    }, 350);
  }, []);

  const handleShowRecommend = useCallback(() => {
    setShowRecommendInDetail(prev => !prev);
  }, []);

  const recommendations = useMemo(() => {
    if (selectedBook) {
      return getRecommendations(selectedBook.id, 3);
    }
    return [];
  }, [selectedBook]);

  const homepageRecommendations = useMemo(() => {
    const topBooks = filteredBooks
      .filter(b => b.borrowCount > 0)
      .sort((a, b) => b.borrowCount - a.borrowCount)
      .slice(0, 6);
    return topBooks.length > 0 ? topBooks : filteredBooks.slice(0, 6);
  }, [filteredBooks]);

  const borrowHistory = useMemo(() => {
    if (!selectedBook) return [];
    return getBookBorrowHistory(selectedBook.id).slice(0, 5);
  }, [selectedBook]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'borrowing':
        return '#F4A261';
      case 'returned':
        return '#2A9D8F';
      case 'overdue':
        return '#E76F51';
      default:
        return '#999';
    }
  };

  const handleNavClick = (page: PageType) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    if (page === 'home') {
      closeDetail();
    }
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar__header">
          <h1 className="sidebar__title">墨香书店</h1>
          <p className="sidebar__subtitle">Bookstore Manager</p>
        </div>
        
        <ul className="sidebar__nav">
          <li>
            <button
              className={`sidebar__nav-item ${currentPage === 'home' ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => handleNavClick('home')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              图书浏览
            </button>
          </li>
          <li>
            <button
              className={`sidebar__nav-item ${currentPage === 'borrow' ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => handleNavClick('borrow')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              借阅记录
            </button>
          </li>
        </ul>
        
        {currentPage === 'home' && (
          <div className="sidebar__categories">
            <h3 className="sidebar__categories-title">图书分类</h3>
            <ul className="sidebar__category-list">
              {CATEGORIES.map(cat => (
                <li key={cat}>
                  <button
                    className={`sidebar__category-item ${selectedCategory === cat ? 'sidebar__category-item--active' : ''}`}
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat === 'all' ? '全部图书' : cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="sidebar__footer">
          <p>独立书店管理系统 v1.0</p>
        </div>
      </nav>
      
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {mobileMenuOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>
      
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu__header">
              <h2>墨香书店</h2>
              <button onClick={() => setMobileMenuOpen(false)}>×</button>
            </div>
            <ul>
              <li>
                <button
                  className={currentPage === 'home' ? 'active' : ''}
                  onClick={() => handleNavClick('home')}
                >
                  图书浏览
                </button>
              </li>
              <li>
                <button
                  className={currentPage === 'borrow' ? 'active' : ''}
                  onClick={() => handleNavClick('borrow')}
                >
                  借阅记录
                </button>
              </li>
            </ul>
            {currentPage === 'home' && (
              <div className="mobile-menu__categories">
                <h3>图书分类</h3>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={selectedCategory === cat ? 'active' : ''}
                    onClick={() => {
                      handleCategoryChange(cat);
                      setMobileMenuOpen(false);
                    }}
                  >
                    {cat === 'all' ? '全部图书' : cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <main className="main-content">
        {currentPage === 'home' ? (
          <div className="home-page">
            <div className="home-page__search">
              <div className="search-box">
                <svg className="search-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索书名、作者或ISBN..."
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  className="search-box__input"
                />
              </div>
            </div>
            
            <div className="home-page__content">
              <div className="home-page__section">
                <h2 className="home-page__section-title">
                  {selectedCategory === 'all' ? '全部图书' : selectedCategory}
                  <span className="home-page__count">{filteredBooks.length} 本</span>
                </h2>
                <BookList
                  books={filteredBooks}
                  onBookClick={handleBookClick}
                  isTransitioning={listTransitioning}
                />
              </div>
              
              <RecommendBar
                books={homepageRecommendations}
                onBookClick={handleBookClick}
                title="热门推荐"
              />
            </div>
          </div>
        ) : (
          <BorrowPanel />
        )}
      </main>
      
      <div className={`detail-overlay ${showDetail ? 'detail-overlay--visible' : ''}`} onClick={closeDetail} />
      <div className={`detail-panel ${showDetail ? 'detail-panel--visible' : ''}`}>
        {selectedBook && (
          <div className="detail-panel__content">
            <button className="detail-panel__close" onClick={closeDetail}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            
            <div className="detail-panel__header">
              <div className="detail-panel__cover">
                {selectedBook.cover ? (
                  <img src={selectedBook.cover} alt={selectedBook.title} />
                ) : (
                  <div className="detail-panel__cover-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="detail-panel__info">
                <h2 className="detail-panel__title">{selectedBook.title}</h2>
                <p className="detail-panel__author">作者：{selectedBook.author}</p>
                <p className="detail-panel__isbn">ISBN：{selectedBook.isbn}</p>
                <p className="detail-panel__category">分类：{selectedBook.category}</p>
                <div className="detail-panel__stock">
                  库存：
                  <span className={selectedBook.stock > 0 ? 'detail-panel__stock--ok' : 'detail-panel__stock--low'}>
                    {selectedBook.stock} 本
                  </span>
                </div>
              </div>
            </div>
            
            <div className="detail-panel__tags">
              {selectedBook.tags.map(tag => (
                <span key={tag} className="detail-panel__tag">{tag}</span>
              ))}
            </div>
            
            <div className="detail-panel__section">
              <h3 className="detail-panel__section-title">内容简介</h3>
              <p className="detail-panel__description">{selectedBook.description}</p>
            </div>
            
            <div className="detail-panel__section">
              <h3 className="detail-panel__section-title">借阅历史</h3>
              {borrowHistory.length > 0 ? (
                <table className="detail-panel__history-table">
                  <thead>
                    <tr>
                      <th>顾客</th>
                      <th>借阅日期</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowHistory.map((record: BorrowRecord) => {
                      const customer = getCustomerById(record.customerId);
                      return (
                        <tr key={record.id}>
                          <td>{customer?.name || '-'}</td>
                          <td>{record.borrowDate}</td>
                          <td>
                            <span
                              className="detail-panel__status-tag"
                              style={{ backgroundColor: getStatusColor(record.status) }}
                            >
                              {getStatusLabel(record.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="detail-panel__empty">暂无借阅记录</p>
              )}
            </div>
            
            <button
              className="detail-panel__recommend-btn"
              onClick={handleShowRecommend}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l2.09 6.26L20 9l-5 4.87L16.18 21 12 17.77 7.82 21 9 13.87 4 9l5.91-.74L12 2z" />
              </svg>
              {showRecommendInDetail ? '收起推荐' : '推荐类似书籍'}
            </button>
            
            {showRecommendInDetail && (
              <div className="detail-panel__recommend-section">
                <h3 className="detail-panel__section-title">相似推荐</h3>
                <div className="detail-panel__recommend-list">
                  {recommendations.map(book => (
                    <div
                      key={book.id}
                      className="detail-panel__recommend-item"
                      onClick={() => {
                        setSelectedBook(book);
                        setShowRecommendInDetail(false);
                      }}
                    >
                      <div className="detail-panel__recommend-cover">
                        {book.cover ? (
                          <img src={book.cover} alt={book.title} />
                        ) : (
                          <div className="detail-panel__recommend-placeholder" />
                        )}
                      </div>
                      <div className="detail-panel__recommend-info">
                        <p className="detail-panel__recommend-title">{book.title}</p>
                        <p className="detail-panel__recommend-author">{book.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <style>{`
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          background: #F4F1EA;
          color: #2D3436;
          -webkit-font-smoothing: antialiased;
        }
        
        #root {
          height: 100vh;
        }
        
        .app {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }
        
        .sidebar {
          width: 250px;
          flex-shrink: 0;
          background: #264653;
          color: #FFFFFF;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        
        .sidebar__header {
          padding: 28px 24px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .sidebar__title {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 4px 0;
          letter-spacing: 1px;
        }
        
        .sidebar__subtitle {
          font-size: 11px;
          opacity: 0.5;
          margin: 0;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .sidebar__nav {
          list-style: none;
          padding: 16px 0;
          margin: 0;
        }
        
        .sidebar__nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          text-align: left;
        }
        
        .sidebar__nav-item:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.05);
        }
        
        .sidebar__nav-item--active {
          color: #FFFFFF;
          background: rgba(42, 157, 143, 0.2);
        }
        
        .sidebar__nav-item--active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: #2A9D8F;
          border-radius: 0 2px 2px 0;
        }
        
        .sidebar__nav-item svg {
          width: 20px;
          height: 20px;
        }
        
        .sidebar__categories {
          padding: 16px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .sidebar__categories-title {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.5;
          margin: 0 24px 12px;
        }
        
        .sidebar__category-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .sidebar__category-item {
          width: 100%;
          padding: 10px 24px 10px 32px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          position: relative;
        }
        
        .sidebar__category-item:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.03);
        }
        
        .sidebar__category-item--active {
          color: #2A9D8F;
          font-weight: 500;
        }
        
        .sidebar__category-item--active::after {
          content: '';
          position: absolute;
          bottom: 8px;
          left: 32px;
          right: 24px;
          height: 2px;
          background: #2A9D8F;
          border-radius: 1px;
        }
        
        .sidebar__footer {
          margin-top: auto;
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 11px;
          opacity: 0.4;
        }
        
        .sidebar__footer p {
          margin: 0;
        }
        
        .mobile-menu-btn {
          display: none;
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 100;
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 8px;
          background: #264653;
          color: #FFFFFF;
          cursor: pointer;
          align-items: center;
          justify-content: center;
        }
        
        .mobile-menu-btn svg {
          width: 24px;
          height: 24px;
        }
        
        .mobile-menu-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 200;
        }
        
        .mobile-menu {
          position: absolute;
          top: 0;
          left: 0;
          width: 280px;
          height: 100%;
          background: #264653;
          color: #FFFFFF;
          overflow-y: auto;
          animation: slideInLeft 0.3s ease;
        }
        
        .mobile-menu__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .mobile-menu__header h2 {
          margin: 0;
          font-size: 18px;
        }
        
        .mobile-menu__header button {
          background: none;
          border: none;
          color: #FFFFFF;
          font-size: 28px;
          cursor: pointer;
          line-height: 1;
        }
        
        .mobile-menu ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .mobile-menu li button {
          width: 100%;
          padding: 14px 20px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 15px;
          text-align: left;
          cursor: pointer;
        }
        
        .mobile-menu li button.active {
          color: #2A9D8F;
          background: rgba(42, 157, 143, 0.2);
        }
        
        .mobile-menu__categories {
          padding: 16px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .mobile-menu__categories h3 {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.5;
          margin: 0 20px 12px;
        }
        
        .mobile-menu__categories button {
          display: block;
          width: 100%;
          padding: 10px 20px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          text-align: left;
          cursor: pointer;
        }
        
        .mobile-menu__categories button.active {
          color: #2A9D8F;
        }
        
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        .main-content {
          flex: 1;
          overflow-y: auto;
          padding: 32px 40px;
        }
        
        .home-page {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .home-page__search {
          margin-bottom: 28px;
        }
        
        .search-box {
          position: relative;
          max-width: 500px;
        }
        
        .search-box__icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: #B8A898;
        }
        
        .search-box__input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 1px solid #E8D8C8;
          border-radius: 8px;
          font-size: 15px;
          color: #2D3436;
          background: #FFFFFF;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          outline: none;
        }
        
        .search-box__input:focus {
          border-color: #2A9D8F;
          box-shadow: 0 0 0 4px rgba(42, 157, 143, 0.1);
        }
        
        .search-box__input::placeholder {
          color: #B8A898;
        }
        
        .home-page__section-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 16px 0;
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        
        .home-page__count {
          font-size: 14px;
          font-weight: normal;
          color: #888;
        }
        
        .detail-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(38, 70, 83, 0.3);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.35s ease, visibility 0.35s ease;
          z-index: 50;
        }
        
        .detail-overlay--visible {
          opacity: 1;
          visibility: visible;
        }
        
        .detail-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 500px;
          max-width: 90vw;
          height: 100vh;
          background: #FFFFFF;
          box-shadow: -8px 0 32px rgba(38, 70, 83, 0.15);
          transform: translateX(100%);
          transition: transform 0.35s ease-out;
          z-index: 60;
          overflow-y: auto;
        }
        
        .detail-panel--visible {
          transform: translateX(0);
        }
        
        .detail-panel__content {
          padding: 32px;
          position: relative;
        }
        
        .detail-panel__close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: #F4F1EA;
          color: #666;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .detail-panel__close:hover {
          background: #E8D8C8;
          color: #333;
        }
        
        .detail-panel__close svg {
          width: 18px;
          height: 18px;
        }
        
        .detail-panel__header {
          display: flex;
          gap: 20px;
          margin-bottom: 24px;
        }
        
        .detail-panel__cover {
          width: 120px;
          height: 160px;
          flex-shrink: 0;
          background: #E8D8C8;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .detail-panel__cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .detail-panel__cover-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #B8A898;
        }
        
        .detail-panel__cover-placeholder svg {
          width: 60px;
          height: 60px;
        }
        
        .detail-panel__info {
          flex: 1;
          min-width: 0;
        }
        
        .detail-panel__title {
          font-size: 22px;
          font-weight: 600;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }
        
        .detail-panel__author,
        .detail-panel__isbn,
        .detail-panel__category {
          font-size: 14px;
          color: #666;
          margin: 4px 0;
        }
        
        .detail-panel__stock {
          margin-top: 12px;
          font-size: 14px;
        }
        
        .detail-panel__stock--ok {
          color: #2A9D8F;
          font-weight: 600;
        }
        
        .detail-panel__stock--low {
          color: #E76F51;
          font-weight: 600;
        }
        
        .detail-panel__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
        }
        
        .detail-panel__tag {
          padding: 4px 12px;
          background: #E6F5F3;
          color: #2A9D8F;
          font-size: 12px;
          border-radius: 4px;
        }
        
        .detail-panel__section {
          margin-bottom: 24px;
        }
        
        .detail-panel__section-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #E8D8C8;
        }
        
        .detail-panel__description {
          font-size: 14px;
          line-height: 1.7;
          color: #555;
          margin: 0;
        }
        
        .detail-panel__history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        
        .detail-panel__history-table th,
        .detail-panel__history-table td {
          padding: 8px 10px;
          text-align: left;
          border-bottom: 1px solid #E8D8C8;
        }
        
        .detail-panel__history-table th {
          font-weight: 500;
          color: #888;
          background: #F9F6F0;
        }
        
        .detail-panel__status-tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 3px;
          color: #FFFFFF;
          font-size: 11px;
        }
        
        .detail-panel__empty {
          font-size: 13px;
          color: #999;
          margin: 0;
          padding: 16px 0;
          text-align: center;
        }
        
        .detail-panel__recommend-btn {
          width: 100%;
          padding: 12px 20px;
          background: #2A9D8F;
          color: #FFFFFF;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.2s ease;
        }
        
        .detail-panel__recommend-btn:hover {
          background: #21867A;
        }
        
        .detail-panel__recommend-btn svg {
          width: 18px;
          height: 18px;
        }
        
        .detail-panel__recommend-section {
          margin-top: 20px;
          animation: fadeInUp 0.3s ease;
        }
        
        .detail-panel__recommend-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .detail-panel__recommend-item {
          display: flex;
          gap: 12px;
          padding: 10px;
          background: #F9F6F0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .detail-panel__recommend-item:hover {
          background: #E8D8C8;
          transform: translateX(4px);
        }
        
        .detail-panel__recommend-cover {
          width: 50px;
          height: 70px;
          flex-shrink: 0;
          background: #E8D8C8;
          border-radius: 3px;
          overflow: hidden;
        }
        
        .detail-panel__recommend-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .detail-panel__recommend-placeholder {
          width: 100%;
          height: 100%;
          background: #D8C8B8;
        }
        
        .detail-panel__recommend-info {
          flex: 1;
          min-width: 0;
        }
        
        .detail-panel__recommend-title {
          font-size: 13px;
          font-weight: 500;
          margin: 0 0 4px 0;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .detail-panel__recommend-author {
          font-size: 12px;
          color: #888;
          margin: 0;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
          
          .mobile-menu-btn {
            display: flex;
          }
          
          .mobile-menu-overlay {
            display: block;
          }
          
          .main-content {
            padding: 70px 20px 24px;
          }
          
          .detail-panel {
            width: 100%;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
