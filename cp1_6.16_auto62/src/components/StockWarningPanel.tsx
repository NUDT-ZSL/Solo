import { useState } from 'react';
import type { Book } from '../types';
import './StockWarningPanel.css';

interface StockWarningPanelProps {
  lowStockBooks: Book[];
  onRestock: (bookId: string) => void;
}

const StockWarningPanel = ({ lowStockBooks, onRestock }: StockWarningPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [restockedBooks, setRestockedBooks] = useState<Set<string>>(new Set());

  const handleRestock = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onRestock(bookId);
    setRestockedBooks((prev) => new Set(prev).add(bookId));
    setTimeout(() => {
      setRestockedBooks((prev) => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
    }, 2000);
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const outOfStockBooks = lowStockBooks.filter((b) => b.stock === 0);
  const lowOnlyBooks = lowStockBooks.filter((b) => b.stock > 0 && b.stock < 3);

  return (
    <>
      <button
        className={`warning-toggle-btn ${lowStockBooks.length > 0 ? 'has-warning' : ''}`}
        onClick={togglePanel}
      >
        <span className="warning-icon">⚠️</span>
        {lowStockBooks.length > 0 && (
          <span className="warning-count">{lowStockBooks.length}</span>
        )}
        <span className="warning-label">库存预警</span>
      </button>

      <div className={`stock-warning-panel ${isOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h3>📦 库存预警</h3>
          <button className="panel-close-btn" onClick={togglePanel}>
            ✕
          </button>
        </div>

        {lowStockBooks.length === 0 ? (
          <div className="panel-empty">
            太棒了！所有书籍库存充足 🎉
          </div>
        ) : (
          <div className="panel-content">
            {outOfStockBooks.length > 0 && (
              <div className="warning-section">
                <h4 className="section-title out-of-stock-title">
                  ❌ 缺货 ({outOfStockBooks.length})
                </h4>
                <div className="warning-list">
                  {outOfStockBooks.map((book) => (
                    <WarningBookItem
                      key={book.id}
                      book={book}
                      onRestock={handleRestock}
                      isRestocked={restockedBooks.has(book.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {lowOnlyBooks.length > 0 && (
              <div className="warning-section">
                <h4 className="section-title low-stock-title">
                  ⚠️ 库存不足 ({lowOnlyBooks.length})
                </h4>
                <div className="warning-list">
                  {lowOnlyBooks.map((book) => (
                    <WarningBookItem
                      key={book.id}
                      book={book}
                      onRestock={handleRestock}
                      isRestocked={restockedBooks.has(book.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {lowStockBooks.length > 0 && (
          <div className="panel-footer">
            <button className="restock-all-btn" onClick={() => {}}>
              一键补货全部
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="panel-overlay" onClick={togglePanel}></div>
      )}
    </>
  );
};

interface WarningBookItemProps {
  book: Book;
  onRestock: (bookId: string, e: React.MouseEvent) => void;
  isRestocked: boolean;
}

const WarningBookItem = ({ book, onRestock, isRestocked }: WarningBookItemProps) => {
  const isOutOfStock = book.stock === 0;

  return (
    <div className={`warning-book-item ${isOutOfStock ? 'out-of-stock-item' : ''}`}>
      <div className="warning-book-info">
        <div className="warning-book-title">{book.title}</div>
        <div className="warning-book-author">{book.author}</div>
        <div className={`warning-book-stock ${isOutOfStock ? 'stock-zero' : 'stock-low'}`}>
          库存：{book.stock} 本
        </div>
      </div>
      <button
        className={`restock-btn ${isRestocked ? 'restocked' : ''}`}
        onClick={(e) => onRestock(book.id, e)}
        disabled={isRestocked}
      >
        {isRestocked ? '✓ 已补货' : '补货'}
      </button>
    </div>
  );
};

export default StockWarningPanel;
