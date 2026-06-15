import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, BookOpen, ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react';
import { useAppStore } from '../store';
import type { BookRecommendation, ReadingListItem } from '../types';

interface BookCardData extends BookRecommendation {
  inReadingList: boolean;
  readingListId?: number;
}

export default function RecommendPanel() {
  const { currentUser, addReadingItem, removeReadingItem, readingList } = useAppStore();
  const [greeting, setGreeting] = useState('');
  const [topWords, setTopWords] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<BookCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/recommendations/${currentUser.id}`);
      const data = await res.json();
      setGreeting(data.greeting || '');
      setTopWords(data.topWords || []);

      const booksWithStatus: BookCardData[] = (data.recommendations || []).map(
        (book: BookRecommendation) => {
          const existing = readingList.find(
            (r) => r.bookTitle === book.bookTitle && r.bookAuthor === book.bookAuthor
          );
          return {
            ...book,
            inReadingList: !!existing,
            readingListId: existing?.id
          };
        }
      );
      setRecommendations(booksWithStatus);
    } catch (e) {
      console.error('Failed to fetch recommendations:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, readingList]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleToggleReadingList = async (book: BookCardData, index: number) => {
    if (!currentUser) return;

    try {
      const res = await fetch('/api/reading-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          bookTitle: book.bookTitle,
          bookAuthor: book.bookAuthor
        })
      });
      const data = await res.json();

      setRecommendations((prev) =>
        prev.map((b, i) => {
          if (i !== index) return b;
          if (data.added) {
            const newItem: ReadingListItem = {
              id: data.id as number,
              userId: currentUser.id,
              bookTitle: b.bookTitle,
              bookAuthor: b.bookAuthor,
              doubanUrl: data.doubanUrl,
              addedAt: new Date().toISOString()
            };
            addReadingItem(newItem);
            return { ...b, inReadingList: true, readingListId: data.id };
          } else if (data.removed) {
            removeReadingItem(data.id as number);
            return { ...b, inReadingList: false, readingListId: undefined };
          }
          return b;
        })
      );
    } catch (e) {
      console.error('Failed to toggle reading list:', e);
    }
  };

  const today = new Date();
  const weekDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (weekDay === 0 ? 6 : weekDay - 1));
  const lastUpdate = `${monday.getMonth() + 1}月${monday.getDate()}日`;

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '12px'
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: "'Playfair Display', serif",
              fontSize: '32px',
              color: '#3e2723'
            }}
          >
            我的荐书
          </h1>
          <span style={{ fontSize: '13px', color: '#888' }}>
            最后更新：{lastUpdate}（每周一自动更新）
          </span>
        </div>

        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#fff3e0',
            borderRadius: '14px',
            borderLeft: '4px solid #ff7043'
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 500,
              color: '#4e342e',
              lineHeight: 1.7
            }}
          >
            {greeting || '正在为你分析阅读兴趣...'}
          </p>
          {topWords.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              {topWords.slice(0, 5).map((word) => (
                <span
                  key={word}
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    backgroundColor: 'white',
                    color: '#e64a19',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  #{word}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 40,
              height: 40,
              border: '3px solid #ffcc80',
              borderTopColor: '#ff7043',
              borderRadius: '50%',
              margin: '0 auto 16px'
            }}
          />
          正在为你精选好书...
        </div>
      )}

      {!loading && recommendations.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#666'
          }}
        >
          <BookOpen size={64} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ fontSize: '16px' }}>暂无荐书，多参与小组讨论后再来看看吧~</p>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '24px',
          justifyContent: 'center'
        }}
      >
        <AnimatePresence>
          {recommendations.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              style={{
                width: '100%',
                maxWidth: '260px',
                justifySelf: 'center'
              }}
            >
              <BookCard
                book={book}
                index={index}
                onToggle={() => handleToggleReadingList(book, index)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BookCard({
  book,
  index,
  onToggle
}: {
  book: BookCardData;
  index: number;
  onToggle: () => void;
}) {
  const [isFlipping, setIsFlipping] = useState(false);
  const doubanUrl = `https://search.douban.com/book/subject_search?search_text=${encodeURIComponent(
    book.bookTitle
  )}`;

  const handleClick = () => {
    setIsFlipping(true);
    setTimeout(() => {
      onToggle();
      setTimeout(() => setIsFlipping(false), 150);
    }, 150);
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.25s, transform 0.25s',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      className="book-card"
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', minHeight: '130px' }}>
        <div
          style={{
            width: '88px',
            minWidth: '88px',
            backgroundColor: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 10px'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <BookOpen size={36} style={{ color: '#999' }} />
            <span
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: '#ff7043',
                color: 'white',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(255,112,67,0.4)'
              }}
            >
              {index + 1}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, padding: '14px 14px 12px', minWidth: 0 }}>
          <h3
            style={{
              margin: '0 0 6px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#3e2723',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
            title={book.bookTitle}
          >
            {book.bookTitle}
          </h3>
          <p
            style={{
              margin: '0 0 10px 0',
              fontSize: '12px',
              color: '#888',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {book.bookAuthor}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: '#6d4c41',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {book.reason}
          </p>
        </div>
      </div>

      <div
        style={{
          padding: '12px 14px 14px',
          marginTop: 'auto',
          borderTop: '1px solid #f5f5f5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => window.open(doubanUrl, '_blank')}
          style={{
            padding: '7px 12px',
            backgroundColor: '#fff3e0',
            color: '#e64a19',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <ExternalLink size={13} />
          豆瓣
        </motion.button>

        <motion.button
          animate={isFlipping ? { rotateY: 180 } : { rotateY: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          whileTap={!isFlipping ? { scale: 0.9 } : {}}
          onClick={handleClick}
          style={{
            padding: '8px 14px',
            backgroundColor: book.inReadingList ? '#ff7043' : 'white',
            color: book.inReadingList ? 'white' : '#ff7043',
            border: book.inReadingList ? 'none' : '1.5px solid #ff7043',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backfaceVisibility: 'hidden'
          }}
        >
          <motion.span
            animate={book.inReadingList ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.2 }}
            style={{ display: 'inline-flex' }}
          >
            {book.inReadingList ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </motion.span>
          <span style={{ transform: isFlipping ? 'rotateY(180deg)' : 'none' }}>
            {book.inReadingList ? '已收藏' : '加入待读'}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
