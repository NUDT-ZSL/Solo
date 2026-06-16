import { useState } from 'react';
import type { LayoutRecommendation, Book } from '../types';
import './LayoutRecommend.css';

interface LayoutRecommendProps {
  layout: LayoutRecommendation[];
}

const LayoutRecommend = ({ layout }: LayoutRecommendProps) => {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [showBooksModal, setShowBooksModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LayoutRecommendation | null>(null);

  const handleCellClick = (index: number, item: LayoutRecommendation) => {
    setSelectedCell(index);
    setSelectedCategory(item);
    setShowBooksModal(true);
  };

  const handleCloseModal = () => {
    setShowBooksModal(false);
    setSelectedCell(null);
    setTimeout(() => setSelectedCategory(null), 300);
  };

  const grid = [...layout];
  while (grid.length < 9) {
    grid.push({ category: '待填充', bookCount: 0, books: [] });
  }

  return (
    <div className="layout-recommend-container">
      <h2 className="layout-title">🗺️ 书展布局推荐</h2>
      <p className="layout-subtitle">
        根据热门推荐和库存数量，为您推荐以下书展陈列布局
      </p>

      <div className="layout-grid">
        {grid.slice(0, 9).map((item, index) => (
          <div
            key={index}
            className={`layout-cell ${selectedCell === index ? 'selected' : ''} ${item.bookCount === 0 ? 'empty' : ''}`}
            onClick={() => item.bookCount > 0 && handleCellClick(index, item)}
          >
            <div className="cell-category">{item.category}</div>
            <div className="cell-count">
              {item.bookCount} 本
            </div>
            {item.bookCount > 0 && (
              <div className="cell-action">点击查看书单 →</div>
            )}
          </div>
        ))}
      </div>

      <div className="layout-legend">
        <div className="legend-item">
          <span className="legend-dot hot"></span>
          热门推荐分类
        </div>
        <div className="legend-item">
          <span className="legend-dot stock"></span>
          高库存分类
        </div>
      </div>

      {showBooksModal && selectedCategory && (
        <div className="books-modal-overlay" onClick={handleCloseModal}>
          <div className="books-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseModal}>
              ✕
            </button>
            <h3 className="modal-title">{selectedCategory.category}</h3>
            <p className="modal-subtitle">共 {selectedCategory.bookCount} 本推荐书籍</p>
            <div className="modal-books-list">
              {selectedCategory.books.map((book) => (
                <BookListItem key={book.id} book={book} />
              ))}
              {selectedCategory.books.length === 0 && (
                <div className="modal-empty">暂无书籍</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BookListItem = ({ book }: { book: Book }) => {
  return (
    <div className="book-list-item">
      <div className="book-list-cover" style={{ background: getColorByCategory(book.category) }}>
        <span className="book-list-spine">{book.title.slice(0, 1)}</span>
      </div>
      <div className="book-list-info">
        <div className="book-list-title">{book.title}</div>
        <div className="book-list-author">{book.author}</div>
        <div className="book-list-price">¥{book.price.toFixed(2)}</div>
      </div>
      <div className="book-list-stock">
        库存: {book.stock}
      </div>
    </div>
  );
};

const categoryColors: Record<string, string> = {
  '文学小说': '#8B4513',
  '历史传记': '#4A5568',
  '科学技术': '#2D3748',
  '艺术设计': '#744210',
  '商业管理': '#742A2A',
  '心理学': '#553C9A',
  '哲学思想': '#2C5282',
  '生活方式': '#276749',
  '儿童读物': '#B7791F',
  '未分类': '#666666',
  '待填充': '#A0AEC0'
};

const getColorByCategory = (category: string): string => {
  return categoryColors[category] || '#666666';
};

export default LayoutRecommend;
