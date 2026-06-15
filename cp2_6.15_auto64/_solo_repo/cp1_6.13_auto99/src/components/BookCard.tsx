import React, { useEffect, useRef, useState } from 'react';
import type { Book } from '../types';
import { useCart } from '../hooks/useCart';
import { useData } from '../context/DataContext';

interface Props { book: Book; index?: number; }

const FALLBACK_COVER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">' +
  '<rect width="400" height="560" fill="#D2B48C"/>' +
  '<text x="200" y="260" text-anchor="middle" font-size="80" fill="#8B4513">📚</text>' +
  '<text x="200" y="340" text-anchor="middle" font-size="18" fill="#8B4513" font-family="sans-serif">封面加载失败</text>' +
  '</svg>'
);

const BookCard: React.FC<Props> = ({ book, index = 0 }) => {
  const { addToCart } = useCart();
  const { setSelectedBook } = useData();
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(book);
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!imgError) {
      setImgError(true);
      e.currentTarget.src = FALLBACK_COVER;
    }
  };

  return (
    <div
      ref={cardRef}
      className={`book-card ${visible ? 'book-card--visible' : ''}`}
      style={{ transitionDelay: `${Math.min(index, 20) * 100}ms` }}
      onClick={() => setSelectedBook(book)}
    >
      <div className="book-cover-wrap">
        <img
          src={imgError ? FALLBACK_COVER : book.cover}
          alt={book.title}
          className="book-cover"
          loading="lazy"
          onError={handleImgError}
        />
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
