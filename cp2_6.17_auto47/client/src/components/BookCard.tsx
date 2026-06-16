import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Book } from '../types';

interface Props {
  book: Book;
  index?: number;
}

export function BookCard({ book, index = 0 }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Link to={`/books/${book.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        ref={ref}
        className="card"
        style={{
          width: 180,
          height: 260,
          overflow: 'hidden',
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(10px)',
          transition: `opacity 0.4s ease ${index * 50}ms, transform 0.4s ease ${index * 50}ms, box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      >
        <div
          style={{
            height: '60%',
            background: '#f5f5f4',
            overflow: 'hidden',
          }}
        >
          {inView && (
            <img
              src={book.coverUrl}
              alt={book.title}
              onLoad={() => setLoaded(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: loaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}
        </div>
        <div style={{ padding: 12 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#292524',
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {book.title}
          </h3>
          <p
            style={{
              fontSize: 12,
              color: '#78716c',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {book.author}
          </p>
        </div>
      </div>
    </Link>
  );
}
