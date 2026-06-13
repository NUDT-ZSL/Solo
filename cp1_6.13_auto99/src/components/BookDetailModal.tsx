import React, { useEffect } from 'react';
import { useData } from '../context/DataContext';

const BookDetailModal: React.FC = () => {
  const { selectedBook, setSelectedBook } = useData();
  const { addToCart, setCartOpen } = useCart();

  useEffect(() => {
    if (!selectedBook) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedBook(null); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [selectedBook]);

  if (!selectedBook) return null;

  return (
    <div className="modal-overlay" onClick={() => setSelectedBook(null)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setSelectedBook(null)} aria-label="关闭">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="modal-body">
          <div className="modal-cover-col">
            <img className="modal-cover" src={selectedBook.cover} alt={selectedBook.title} />
          </div>
          <div className="modal-info-col">
            <span className="modal-cat-badge">{selectedBook.category}</span>
            <h2 className="modal-title">{selectedBook.title}</h2>
            <p className="modal-author">作者：{selectedBook.author}</p>
            <div className="modal-meta">
              <div className="meta-item"><span className="meta-label">ISBN</span><span className="meta-value">{selectedBook.isbn}</span></div>
              <div className="meta-item"><span className="meta-label">出版日期</span><span className="meta-value">{selectedBook.publishDate}</span></div>
              <div className="meta-item"><span className="meta-label">页数</span><span className="meta-value">{selectedBook.pages} 页</span></div>
              <div className="meta-item"><span className="meta-label">库存</span><span className="meta-value in-stock">{selectedBook.stock} 本</span></div>
            </div>
            <div className="modal-section">
              <h4>内容简介</h4>
              <p>{selectedBook.description}</p>
            </div>
            <div className="modal-section">
              <h4>作者简介</h4>
              <p>{selectedBook.authorIntro}</p>
            </div>
            <div className="modal-actions">
              <div className="modal-price">¥{selectedBook.price.toFixed(2)}</div>
              <div className="modal-btn-group">
                <button
                  className="btn-secondary"
                  onClick={() => { setSelectedBook(null); setCartOpen(true); }}
                >查看购物车</button>
                <button
                  className="btn-primary"
                  onClick={() => addToCart(selectedBook)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  加入购物车
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailModal;
