import { useState } from 'react';
import type { Book, CategoryColorMap } from '../types';
import './Bookshelf.css';

const categoryColors: CategoryColorMap = {
  '文学小说': '#8B4513',
  '历史传记': '#4A5568',
  '科学技术': '#2D3748',
  '艺术设计': '#744210',
  '商业管理': '#742A2A',
  '心理学': '#553C9A',
  '哲学思想': '#2C5282',
  '生活方式': '#276749',
  '儿童读物': '#B7791F',
  '未分类': '#666666'
};

const getCategoryColor = (category: string): string => {
  return categoryColors[category] || '#666666';
};

interface BookshelfProps {
  books: Book[];
  lowStockBooks: Book[];
}

const BOOKS_PER_SHELF = 6;

const Bookshelf = ({ books, lowStockBooks }: BookshelfProps) => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const shelves: Book[][] = [];
  for (let i = 0; i < books.length; i += BOOKS_PER_SHELF) {
    shelves.push(books.slice(i, i + BOOKS_PER_SHELF));
  }

  const isLowStock = (bookId: string): boolean => {
    return lowStockBooks.some((b) => b.id === bookId);
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
  };

  const handleCloseModal = () => {
    setSelectedBook(null);
  };

  return (
    <div className="bookshelf-container">
      <h2 className="bookshelf-title">📚 书店书架</h2>
      <div className="bookshelf">
        {shelves.map((shelf, shelfIndex) => (
          <div key={shelfIndex} className="shelf">
            <div className="shelf-books">
              {shelf.map((book) => {
                const lowStock = isLowStock(book.id);
                const outOfStock = book.stock === 0;
                return (
                  <div
                    key={book.id}
                    className={`book-spine ${outOfStock ? 'out-of-stock' : ''}`}
                    style={{ backgroundColor: getCategoryColor(book.category) }}
                    onClick={() => handleBookClick(book)}
                    title={`${book.title} - ${book.author}`}
                  >
                    {lowStock && !outOfStock && (
                      <span className="stock-warning-dot"></span>
                    )}
                    <div className="book-spine-title">{book.title}</div>
                    <div className="book-spine-author">{book.author}</div>
                  </div>
                );
              })}
            </div>
            <div className="shelf-board"></div>
          </div>
        ))}
        {books.length === 0 && (
          <div className="empty-shelf">书架空空如也，快来添加书籍吧~</div>
        )}
      </div>

      {selectedBook && (
        <div className="book-modal-overlay" onClick={handleCloseModal}>
          <div className="book-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseModal}>
              ✕
            </button>
            <div
              className="book-cover"
              style={{ backgroundColor: getCategoryColor(selectedBook.category) }}
            >
              <div className="book-cover-title">{selectedBook.title}</div>
              <div className="book-cover-author">{selectedBook.author}</div>
            </div>
            <div className="book-details">
              <h3 className="book-title">{selectedBook.title}</h3>
              <p className="book-author">作者：{selectedBook.author}</p>
              <p className="book-publisher">出版社：{selectedBook.publisher}</p>
              <div className="book-info-row">
                <span className="book-price">¥{selectedBook.price.toFixed(2)}</span>
                <span className="book-category">{selectedBook.category}</span>
              </div>
              <div className="book-stock">
                库存：
                <span className={selectedBook.stock === 0 ? 'stock-zero' : selectedBook.stock < 3 ? 'stock-low' : 'stock-normal'}>
                  {selectedBook.stock} 本
                </span>
              </div>
              <div className="book-description">
                <strong>推荐语：</strong>
                <p>{selectedBook.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookshelf;
