import { useEffect, useState } from 'react';
import { booksApi, Book } from '../api';

interface Props {
  onOpenBook: (bookId: string) => void;
  onReminderPosted?: () => void;
}

function ProgressRing({ progress, size = 40 }: { progress: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div className="progress-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="progress-ring-bg" cx={size / 2} cy={size / 2} r={radius} />
        <circle
          className="progress-ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-text">{progress}%</div>
    </div>
  );
}

export default function Dashboard({ onOpenBook }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t0 = performance.now();
    booksApi.list().then((data) => {
      setBooks(data.slice(0, 3));
      setLoading(false);
      const elapsed = performance.now() - t0;
      if (elapsed > 200) {
        console.warn(`[perf] Dashboard books load took ${elapsed.toFixed(0)}ms (>200ms)`);
      }
    });
  }, []);

  return (
    <div>
      <h1 className="page-title">📚 共读面板</h1>
      <p className="page-subtitle">和社团的小伙伴一起，把想读的书一本本读完</p>

      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : (
        <div className="books-grid">
          {books.map((book) => (
            <div
              key={book._id}
              className="book-card"
              onClick={() => onOpenBook(book._id)}
            >
              <ProgressRing progress={book.progress} />
              <div className="book-card-top">
                <div
                  className="book-cover-block"
                  style={{ background: book.coverColor }}
                />
                <div className="book-info">
                  <div className="book-title">{book.title}</div>
                  <div className="book-author">{book.author}</div>
                </div>
              </div>
              <div className="book-card-bottom">
                <div className="book-progress-label">
                  已读 {Math.round((book.progress / 100) * book.totalPages)} / {book.totalPages} 页
                </div>
                <div className="book-action">进入共读 →</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
