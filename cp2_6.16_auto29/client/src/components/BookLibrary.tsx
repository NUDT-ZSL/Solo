import React, { useState, useEffect } from 'react';
import { getBooks } from '../api';
import type { Book } from '../types';

interface BookLibraryProps {
  navigate: (r: any) => void;
  onSelectBook: (id: string, title: string) => void;
}

export default function BookLibrary({ navigate, onSelectBook }: BookLibraryProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBooks().then(data => {
      setBooks(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
        <div style={{ color: '#7b1fa2', fontSize: 16 }}>书库加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ color: '#4a148c', fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          探索书库
        </h1>
        <p style={{ color: '#7b1fa2', fontSize: 16 }}>
          选择一本书，认领章节，留下你的阅读印记
        </p>
      </div>
      <div
        className="book-library-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 24,
          justifyContent: 'center',
        }}
      >
        {books.map(book => (
          <div
            key={book.id}
            className="book-card"
            style={{
              width: 260,
              height: 340,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #fce4ec, #f8bbd0)',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              margin: '0 auto',
            }}
            onClick={() => onSelectBook(book.id, book.title)}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            }}
          >
            <div
              style={{
                height: '55%',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <img
                src={book.cover}
                alt={book.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                loading="lazy"
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 40,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.3))',
                }}
              />
            </div>
            <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#4a148c',
                  marginBottom: 6,
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {book.title}
              </div>
              <div style={{ fontSize: 14, color: '#7b1fa2' }}>{book.author}</div>
              <div
                style={{
                  fontSize: 12,
                  color: '#9c27b0',
                  marginTop: 6,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  opacity: 0.8,
                }}
              >
                {book.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
