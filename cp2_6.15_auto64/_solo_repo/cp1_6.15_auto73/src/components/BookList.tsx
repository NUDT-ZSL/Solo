import { Book } from '../types';
import BookCard from './BookCard';

interface BookListProps {
  books: Book[];
  onBookClick: (book: Book) => void;
  isTransitioning?: boolean;
}

const BookList = ({ books, onBookClick, isTransitioning = false }: BookListProps) => {
  return (
    <div className={`book-list ${isTransitioning ? 'book-list--fading' : ''}`}>
      {books.length > 0 ? (
        <div className="book-list__grid">
          {books.map(book => (
            <BookCard
              key={book.id}
              book={book}
              onClick={onBookClick}
            />
          ))}
        </div>
      ) : (
        <div className="book-list__empty">
          <div className="book-list__empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <p className="book-list__empty-text">未找到匹配图书</p>
        </div>
      )}
      
      <style>{`
        .book-list {
          opacity: 1;
          transition: opacity 0.3s ease;
        }
        
        .book-list--fading {
          opacity: 0;
        }
        
        .book-list__grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        
        @media (max-width: 1200px) {
          .book-list__grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (max-width: 900px) {
          .book-list__grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .book-list__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #B8A898;
          animation: fadeInUp 0.4s ease-out;
        }
        
        .book-list__empty-icon {
          width: 80px;
          height: 80px;
          margin-bottom: 16px;
        }
        
        .book-list__empty-icon svg {
          width: 100%;
          height: 100%;
        }
        
        .book-list__empty-text {
          font-size: 16px;
          margin: 0;
          color: #888;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default BookList;
