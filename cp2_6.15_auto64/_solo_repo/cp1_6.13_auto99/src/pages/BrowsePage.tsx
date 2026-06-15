import React, { useEffect } from 'react';
import CategoryFilter from '../components/CategoryFilter';
import BookCard from '../components/BookCard';
import { useData } from '../context/DataContext';
import { bookApi } from '../utils/api';

const BrowsePage: React.FC = () => {
  const { books, setBooks, loading, setLoading, filteredBooks, selectedCategory } = useData();

  useEffect(() => {
    let mounted = true;
    bookApi.getAll()
      .then(data => { if (mounted) setBooks(data); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="browse-page">
        <CategoryFilter />
        <div className="books-area">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>正在加载书籍...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="browse-page">
      <CategoryFilter />
      <div className="books-area">
        <div className="books-area-header">
          <h2 className="books-area-title">
            {selectedCategory === '全部' ? '全部书籍' : selectedCategory}
          </h2>
          <span className="books-count">{filteredBooks.length} 本</span>
        </div>
        {filteredBooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>没有找到匹配的书籍</p>
            <span>试试其他关键词或类别</span>
          </div>
        ) : (
          <div className="books-grid" key={selectedCategory}>
            {filteredBooks.map((book, idx) => (
              <BookCard key={book.id} book={book} index={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowsePage;
