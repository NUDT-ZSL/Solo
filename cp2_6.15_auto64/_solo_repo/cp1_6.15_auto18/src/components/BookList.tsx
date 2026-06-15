import { Book } from '../api';
import '../styles/BookList.css';

interface BookListProps {
  books: Book[];
  selectedBookId: string | null;
  onSelect: (bookId: string) => void;
}

function BookList({ books, selectedBookId, onSelect }: BookListProps) {
  return (
    <div className="book-list">
      {books.map(book => (
        <div
          key={book.id}
          className={`book-card ${selectedBookId === book.id ? 'selected' : ''}`}
          onClick={() => onSelect(book.id)}
        >
          <div 
            className="book-cover"
            style={{ backgroundColor: book.color }}
          >
            <span className="book-cover-text">{book.title.charAt(0)}</span>
          </div>
          <div className="book-info">
            <h3 className="book-title">{book.title}</h3>
            <p className="book-author">{book.author}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default BookList;
