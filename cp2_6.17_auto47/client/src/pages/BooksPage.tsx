import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { BookCard } from '../components/BookCard';
import { useBooks } from '../hooks/useBooks';
import { debounce } from '../utils';
import type { Book } from '../types';

export function BooksPage() {
  const booksHook = useBooks();
  const [search, setSearch] = useState('');
  const [displayBooks, setDisplayBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    booksHook.fetchBooks().then((data) => {
      setDisplayBooks(data);
      setLoading(false);
    });
  }, []);

  const handleSearch = debounce((q: string) => {
    if (!q.trim()) {
      booksHook.fetchBooks().then(setDisplayBooks);
      return;
    }
    booksHook.searchBooks(q).then(setDisplayBooks);
  }, 300);

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    handleSearch(e.target.value);
  };

  return (
    <div className="container">
      <h1
        style={{
        fontSize: 28,
        fontWeight: 700,
        marginBottom: 24,
        color: '#292524',
      }}
      >
        浏览图书
      </h1>

      <div
        style={{
          position: 'relative',
          maxWidth: 480,
          marginBottom: 32,
        }}
      >
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#a8a29e',
          }}
        />
        <input
          type="text"
          placeholder="搜索书名或作者..."
          value={search}
          onChange={onSearch}
          style={{
            width: '100%',
            paddingLeft: 42,
            paddingRight: 16,
            height: 44,
            fontSize: 14,
            borderRadius: 10,
          }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="loading-spinner" />
        </div>
      ) : displayBooks.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            color: '#78716c',
            fontSize: 14,
            background: 'white',
            borderRadius: 12,
          }}
        >
          没有找到相关图书
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 180px)',
            gap: 20,
            justifyContent: 'space-between',
          }}
        >
          {displayBooks.map((book, i) => (
            <BookCard key={book.id} book={book} index={i} />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          div[style*="grid-template-columns"] > * {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
