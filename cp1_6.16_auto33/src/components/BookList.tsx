import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Member } from '../types';
import BookCard from './BookCard';
import BorrowModal from './BorrowModal';

type SearchDimension = 'title' | 'author' | 'isbn' | 'publisher';

const dimensionLabels: Record<SearchDimension, string> = {
  title: '书名',
  author: '作者',
  isbn: 'ISBN',
  publisher: '出版社',
};

const dimensionPlaceholders: Record<SearchDimension, string> = {
  title: '请输入书名搜索',
  author: '请输入作者搜索',
  isbn: '请输入ISBN',
  publisher: '请输入出版社搜索',
};

interface BookListProps {
  books: Book[];
  members: Member[];
  onRefresh: () => void;
}

function BookList({ books, members, onRefresh }: BookListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dimension, setDimension] = useState<SearchDimension>('title');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [animatingIn, setAnimatingIn] = useState(false);
  const [borrowingBook, setBorrowingBook] = useState<Book | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDimensionChange = (dim: SearchDimension) => {
    setDimension(dim);
    setDropdownOpen(false);
  };

  const toggleDropdown = () => {
    if (!dropdownOpen) {
      setAnimatingIn(true);
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
    }
  };

  const filteredBooks = useMemo(() => {
    if (!searchTerm.trim()) return books;
    const term = searchTerm.toLowerCase().trim();
    return books.filter((book) => {
      const field = book[dimension].toLowerCase();
      return field.includes(term);
    });
  }, [books, searchTerm, dimension]);

  const handleCardClick = (book: Book) => {
    setBorrowingBook(book);
  };

  const handleBorrowSuccess = () => {
    setBorrowingBook(null);
    onRefresh();
  };

  return (
    <div>
      <h1 className="page-title">图书管理</h1>

      <div className="search-bar">
        <div className="search-dimension-selector" ref={dropdownRef}>
          <button className="dimension-trigger" onClick={toggleDropdown} type="button">
            {dimensionLabels[dimension]}
            <span className={`arrow ${dropdownOpen ? 'open' : ''}`}>▼</span>
          </button>
          {dropdownOpen && (
            <div className={`dimension-dropdown ${animatingIn ? 'animate-in' : ''}`}>
              {(Object.keys(dimensionLabels) as SearchDimension[]).map((dim) => (
                <div
                  key={dim}
                  className={`option ${dimension === dim ? 'active' : ''}`}
                  onClick={() => handleDimensionChange(dim)}
                >
                  {dimensionLabels[dim]}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="search-input-wrapper">
          <input
            className="search-input"
            type="text"
            placeholder={dimensionPlaceholders[dimension]}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="empty-state">没有找到匹配的图书</div>
      ) : (
        <div className="book-grid">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} onBorrowCallback={handleCardClick} />
          ))}
        </div>
      )}

      {borrowingBook && (
        <BorrowModal
          book={borrowingBook}
          members={members}
          onClose={() => setBorrowingBook(null)}
          onSuccess={handleBorrowSuccess}
        />
      )}
    </div>
  );
}

export default BookList;
