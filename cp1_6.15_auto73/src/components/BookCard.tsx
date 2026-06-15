import { Book } from '../types';

interface BookCardProps {
  book: Book;
  onClick: (book: Book) => void;
  size?: 'normal' | 'small';
}

const BookCard = ({ book, onClick, size = 'normal' }: BookCardProps) => {
  const isSmall = size === 'small';
  
  return (
    <div
      className={`book-card ${isSmall ? 'book-card--small' : ''}`}
      onClick={() => onClick(book)}
    >
      <div className="book-card__cover">
        {book.cover ? (
          <img src={book.cover} alt={book.title} />
        ) : (
          <div className="book-card__placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="book-card__info">
        <h3 className="book-card__title">{book.title}</h3>
        <p className="book-card__author">{book.author}</p>
        <p className="book-card__isbn">ISBN: {book.isbn}</p>
        <div className="book-card__stock">
          <span className="book-card__stock-label">库存:</span>
          <span className={`book-card__stock-value ${book.stock > 0 ? '' : 'book-card__stock-value--low'}`}>
            {book.stock} 本
          </span>
        </div>
      </div>
      
      <style>{`
        .book-card {
          background: #FFFFFF;
          border: 1px solid #E8D8C8;
          border-radius: 4px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
        }
        
        .book-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(38, 70, 83, 0.15);
          border-color: #2A9D8F;
        }
        
        .book-card--small {
          width: 180px;
          min-height: 250px;
        }
        
        .book-card__cover {
          width: 100%;
          height: 160px;
          background: #E8D8C8;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        
        .book-card--small .book-card__cover {
          height: 140px;
        }
        
        .book-card__cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .book-card__placeholder {
          width: 60px;
          height: 60px;
          color: #B8A898;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .book-card__placeholder svg {
          width: 100%;
          height: 100%;
        }
        
        .book-card__info {
          padding: 12px 14px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .book-card--small .book-card__info {
          padding: 10px 12px;
        }
        
        .book-card__title {
          font-size: 15px;
          font-weight: 600;
          color: #2D3436;
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .book-card--small .book-card__title {
          font-size: 14px;
        }
        
        .book-card__author {
          font-size: 13px;
          color: #666;
          margin: 0;
        }
        
        .book-card__isbn {
          font-size: 11px;
          color: #999;
          margin: 0;
        }
        
        .book-card--small .book-card__isbn {
          display: none;
        }
        
        .book-card__stock {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: auto;
          font-size: 12px;
        }
        
        .book-card__stock-label {
          color: #888;
        }
        
        .book-card__stock-value {
          color: #2A9D8F;
          font-weight: 500;
        }
        
        .book-card__stock-value--low {
          color: #E76F51;
        }
      `}</style>
    </div>
  );
};

export default BookCard;
