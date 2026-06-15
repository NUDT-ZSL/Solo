import { useEffect, useRef, useState } from 'react';
import { Book, books } from '@/data/books';

interface BookSelectorProps {
  onSelect: (book: Book) => void;
  theme: 'dark' | 'parchment';
}

function BookCover({ book, index, onSelect, theme }: {
  book: Book;
  index: number;
  onSelect: (book: Book) => void;
  theme: 'dark' | 'parchment';
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200 + index * 150);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (!isVisible) return;
    let running = true;
    const pulse = () => {
      if (!running) return;
      setPulsePhase((prev) => prev + 0.02);
      animRef.current = requestAnimationFrame(pulse);
    };
    animRef.current = requestAnimationFrame(pulse);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isVisible]);

  const pulseScale = 1 + Math.sin(pulsePhase) * 0.008;
  const hoverScale = isHovered ? 1.04 : 1;
  const hoverLift = isHovered ? -4 : 0;
  const curlAngle = isHovered ? 2 : 0;
  const shadowBlur = isHovered ? 30 : 12;

  return (
    <div
      className="book-cover-wrapper"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: `scale(${pulseScale * hoverScale}) translateY(${hoverLift}px)`,
        transition: 'opacity 0.8s ease, transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
        cursor: 'pointer',
        perspective: '800px',
      }}
      onClick={() => onSelect(book)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="book-cover"
        style={{
          width: 180,
          height: 260,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${book.coverColor}, ${book.coverColor}dd)`,
          boxShadow: `${shadowBlur}px ${shadowBlur}px ${shadowBlur * 2}px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.2)`,
          transform: `rotateY(${curlAngle}deg)`,
          transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: isHovered ? 40 : 0,
            height: '100%',
            background: `linear-gradient(to left, rgba(0,0,0,0.3), transparent)`,
            transition: 'width 0.4s ease',
            borderRadius: '0 8px 8px 0',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            width: 40,
            height: 2,
            background: book.coverAccent,
            marginBottom: 16,
            opacity: 0.8,
            borderRadius: 1,
          }}
        />
        <h3
          style={{
            color: book.coverAccent,
            fontSize: 20,
            fontFamily: '"ZCOOL XiaoWei", serif',
            textAlign: 'center',
            lineHeight: 1.4,
            margin: 0,
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            letterSpacing: 2,
          }}
        >
          {book.title}
        </h3>
        <div
          style={{
            width: 40,
            height: 2,
            background: book.coverAccent,
            marginTop: 16,
            marginBottom: 12,
            opacity: 0.8,
            borderRadius: 1,
          }}
        />
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontFamily: '"ZCOOL XiaoWei", serif',
            textAlign: 'center',
            margin: 0,
            letterSpacing: 1,
          }}
        >
          {book.author}
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 11,
            fontFamily: '"ZCOOL XiaoWei", serif',
            textAlign: 'center',
            marginTop: 12,
            margin: 0,
            marginTop: 12,
            lineHeight: 1.5,
          }}
        >
          {book.description}
        </p>
        {isHovered && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              color: book.coverAccent,
              fontSize: 11,
              fontFamily: '"ZCOOL XiaoWei", serif',
              opacity: 0.7,
              animation: 'fadeInUp 0.3s ease',
            }}
          >
            点击翻开 ↗
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookSelector({ onSelect, theme }: BookSelectorProps) {
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTitleVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="book-selector"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        padding: 40,
      }}
    >
      <div
        style={{
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 36,
            fontFamily: '"ZCOOL XiaoWei", serif',
            color: theme === 'dark' ? '#e8e8e8' : '#3d2b1f',
            margin: 0,
            letterSpacing: 6,
            textShadow: theme === 'dark'
              ? '0 0 20px rgba(200,200,255,0.15)'
              : '0 1px 3px rgba(100,70,30,0.2)',
          }}
        >
          影隙书库
        </h1>
        <p
          style={{
            fontSize: 14,
            fontFamily: '"ZCOOL XiaoWei", serif',
            color: theme === 'dark' ? 'rgba(200,200,220,0.4)' : 'rgba(80,60,30,0.5)',
            marginTop: 12,
            letterSpacing: 3,
          }}
        >
          光影之间，文字如风
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 28,
          justifyContent: 'center',
          maxWidth: 1100,
        }}
      >
        {books.map((book, i) => (
          <BookCover
            key={book.id}
            book={book}
            index={i}
            onSelect={onSelect}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
}
