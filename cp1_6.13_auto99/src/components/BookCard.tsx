import React from 'react';
import type { Book } from '../types';
import { useCart } from '../hooks/useCart';
import { useData } from '../context/DataContext';

interface Props { book: Book; index?: number; }

const BookCard: React.FC<Props> = ({ book, index = 0 }) => {
  const { addToCart } = useCart();
  const { setSelectedBook } = useData();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(book);
  };

  return (
    <div
      className="book-card"
      style={{ animationDelay: `${Math.min(index, 20) * 100}ms` }}
      onClick={() => setSelectedBook(book)}
    >
      <div className="book-cover-wrap">
        <img src={book.cover} alt={book.title} className="book-cover" loading="lazy" />
        <span className="book-category-tag">{book.category}</span>
      </div>
      <div className="book-info">
        <h3 className="book-title" title={book.title}>{book.title}</h3>
        <p className="book-author">{book.author}</p>
        <div className="book-footer">
          <span className="book-price">¥{book.price.toFixed(2)}</span>
          <button className="btn-add-cart" onClick={handleAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            加入
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
