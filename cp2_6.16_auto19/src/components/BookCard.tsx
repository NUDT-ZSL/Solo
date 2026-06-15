import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book } from '../types';
import { calculateDistance } from '../utils/distance';
import { useAuth } from '../context/AuthContext';
import './BookCard.css';

interface BookCardProps {
  book: Book;
  onExchange?: (book: Book) => void;
  delay?: number;
}

const GRADIENT_COLORS = [
  'linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
];

export default function BookCard({ book, onExchange, delay = 0 }: BookCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const gradientIndex = Math.abs(hashCode(book.id)) % GRADIENT_COLORS.length;
  const gradient = GRADIENT_COLORS[gradientIndex];

  const distance = user
    ? calculateDistance(user.latitude, user.longitude, book.latitude, book.longitude)
    : null;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const handleClick = () => {
    navigate(`/book/${book.id}`);
  };

  const handleExchange = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExchange) {
      onExchange(book);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`book-card ${isVisible ? 'fade-in' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={handleClick}
    >
      <div className="book-cover-wrapper">
        <div
          className="book-cover"
          style={{ background: gradient }}
        >
          {book.image && (
            <img
              src={book.image}
              alt={book.title}
              className={`book-cover-img ${imageLoaded ? 'loaded' : ''}`}
              onLoad={() => setImageLoaded(true)}
            />
          )}
          {!book.image && (
            <div className="book-cover-placeholder">
              <i className="fas fa-book"></i>
            </div>
          )}
        </div>
        <div className="book-condition-badge">{book.condition}</div>
      </div>

      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>

        <div className="book-tags">
          {book.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="book-footer">
          <div className="book-distance">
            <i className="fas fa-map-marker-alt"></i>
            {distance !== null ? `${distance} km` : '登录查看距离'}
          </div>
          {onExchange && book.ownerId !== user?.id && (
            <button
              className="exchange-btn"
              onClick={handleExchange}
            >
              <i className="fas fa-exchange-alt"></i>
              交换
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
