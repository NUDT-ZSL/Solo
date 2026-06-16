import { useNavigate } from 'react-router-dom';
import { Book } from '../types';
import { isLowStock } from '../services/bookService';

interface BookCardProps {
  book: Book;
  onBorrowCallback: (book: Book) => void;
}

function BookCard({ book, onBorrowCallback }: BookCardProps) {
  const lowStock = isLowStock(book.quantity);
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/books/${book.id}`);
  };

  const handleBorrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBorrowCallback(book);
  };

  return (
    <div className="book-card" onClick={handleCardClick}>
      <div className="card-title" title={book.title}>{book.title}</div>
      <div className="card-author">{book.author}</div>
      <div className="card-secondary-info">{book.publisher}</div>
      <div className="card-secondary-info">ISBN: {book.isbn}</div>
      <div className="card-price">¥{book.price.toFixed(2)}</div>
      <span className={`card-status ${book.quantity > 0 ? 'available' : 'borrowed'}`}>
        {book.quantity > 0 ? '可借阅' : '已借出'}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div className={`card-quantity ${lowStock ? 'low' : ''}`}>
          库存: {book.quantity}本{lowStock ? ' ⚠️' : ''}
        </div>
        {book.quantity > 0 && (
          <button className="btn" style={{ padding: '4px 12px', fontSize: 12 }} onClick={handleBorrowClick}>
            借出
          </button>
        )}
      </div>
    </div>
  );
}

export default BookCard;
