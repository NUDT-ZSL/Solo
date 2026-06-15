import React, { useState, useCallback, useEffect } from 'react';
import BookLibrary from './components/BookLibrary';
import ChapterView from './components/ChapterView';
import AnnotationCard from './components/AnnotationCard';
import { getChapter } from './api';
import type { ChapterDetail, Annotation } from './types';
import './index.css';

type Route =
  | { page: 'library' }
  | { page: 'chapters'; bookId: string }
  | { page: 'chapter'; chapterId: string }
  | { page: 'annotation'; annotationId: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ page: 'library' });
  const [currentUser] = useState({ id: 'u1', name: '书友小读' });
  const [currentBook, setCurrentBook] = useState<{ id: string; title: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chapterDetail, setChapterDetail] = useState<ChapterDetail | null>(null);

  const navigate = useCallback((newRoute: Route) => {
    setRoute(newRoute);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (route.page === 'annotation' && chapterDetail) {
      return;
    }
    if (route.page === 'chapter') {
      getChapter(route.chapterId).then(data => setChapterDetail(data));
    }
  }, [route, chapterDetail]);

  const handleGoHome = () => {
    setRoute({ page: 'library' });
    setCurrentBook(null);
    setChapterDetail(null);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-logo" onClick={handleGoHome}>
            <span>📖</span> 书卷留痕
          </div>
          <input
            className="navbar-search"
            type="text"
            placeholder="搜索书籍或章节..."
          />
          <div className="navbar-user">
            <div className="navbar-user-avatar">{currentUser.name[0]}</div>
            {currentUser.name}
          </div>
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <input type="text" placeholder="搜索书籍或章节..." />
      </div>
      <div className="page-container">
        {route.page === 'library' && (
          <BookLibrary
            navigate={navigate}
            onSelectBook={(id, title) => {
              setCurrentBook({ id, title });
              navigate({ page: 'chapters', bookId: id });
            }}
          />
        )}
        {route.page === 'chapters' && currentBook && (
          <ChapterList
            bookId={currentBook.id}
            bookTitle={currentBook.title}
            navigate={navigate}
            currentUserId={currentUser.id}
            currentUserName={currentUser.name}
          />
        )}
        {route.page === 'chapter' && (
          <ChapterView
            chapterId={route.chapterId}
            currentUserId={currentUser.id}
            currentUserName={currentUser.name}
            navigate={navigate}
            onBackToChapters={() => {
              if (currentBook) {
                navigate({ page: 'chapters', bookId: currentBook.id });
              }
            }}
          />
        )}
        {route.page === 'annotation' && chapterDetail && (
          <AnnotationDetail
            chapterDetail={chapterDetail}
            annotationId={route.annotationId}
            currentUserId={currentUser.id}
            currentUserName={currentUser.name}
            navigate={navigate}
            onBackToChapter={() => {
              navigate({ page: 'chapter', chapterId: chapterDetail.id });
            }}
          />
        )}
      </div>
    </>
  );
}

function ChapterList({
  bookId,
  bookTitle,
  navigate,
  currentUserId,
  currentUserName,
}: {
  bookId: string;
  bookTitle: string;
  navigate: (r: Route) => void;
  currentUserId: string;
  currentUserName: string;
}) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/chapters/${bookId}`)
      .then(r => r.json())
      .then(data => {
        setChapters(data);
        setLoading(false);
      });
  }, [bookId, claimingId]);

  const handleClaim = async (chapterId: string) => {
    setClaimingId(chapterId);
    const res = await fetch('/api/claim-chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId, userId: currentUserId, userName: currentUserName }),
    });
    const data = await res.json();
    if (data.success) {
      setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, claimed_by: data.claimed_by } : c));
    } else {
      alert(data.error || '认领失败');
    }
    setClaimingId(null);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate({ page: 'library' })}
          style={{
            background: 'none',
            border: 'none',
            color: '#4a148c',
            fontSize: 18,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          ← 返回
        </button>
        <h2 style={{ color: '#4a148c', fontSize: 24, fontWeight: 700 }}>{bookTitle}</h2>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {chapters.map(ch => (
          <div
            key={ch.id}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => navigate({ page: 'chapter', chapterId: ch.id })}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
          >
            <div>
              <div style={{ fontWeight: 600, color: '#333', fontSize: 16 }}>{ch.title}</div>
              <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
                {ch.claimed_by ? (
                  <span style={{ color: '#7e57c2' }}>✓ 已被 {ch.claimed_by} 认领</span>
                ) : (
                  <span style={{ color: '#81c784' }}>○ 待认领</span>
                )}
              </div>
            </div>
            {!ch.claimed_by && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleClaim(ch.id);
                }}
                disabled={claimingId === ch.id}
                style={{
                  background: '#7e57c2',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {claimingId === ch.id ? '认领中...' : '认领'}
              </button>
            )}
            {ch.claimed_by && ch.claimed_by === currentUserName && (
              <span
                style={{
                  background: '#e8f5e9',
                  color: '#388e3c',
                  borderRadius: 8,
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                已认领
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnotationDetail({
  chapterDetail,
  annotationId,
  currentUserId,
  currentUserName,
  navigate,
  onBackToChapter,
}: {
  chapterDetail: ChapterDetail;
  annotationId: string;
  currentUserId: string;
  currentUserName: string;
  navigate: (r: Route) => void;
  onBackToChapter: () => void;
}) {
  const annotation = chapterDetail.annotations.find(a => a.id === annotationId);

  if (!annotation) {
    return <div>批注未找到</div>;
  }

  return (
    <div>
      <button
        onClick={onBackToChapter}
        style={{
          background: 'none',
          border: 'none',
          color: '#4a148c',
          fontSize: 16,
          cursor: 'pointer',
          marginBottom: 16,
          padding: '4px 8px',
        }}
      >
        ← 返回章节
      </button>
      <AnnotationCard
        annotation={annotation}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />
    </div>
  );
}
