import { useBookData } from '../hooks/useBookData';
import { useActivityData } from '../hooks/useActivityData';
import { BookCard } from '../components/BookCard';
import { ActivityCard } from '../components/ActivityCard';
import { useUser } from '../context/UserContext';
import { useRef, useEffect } from 'react';

export function HomePage() {
  const { books, loading: booksLoading, reserve } = useBookData();
  const { activities, loading: activitiesLoading, register } = useActivityData();
  const { user, refresh } = useUser();
  const hotBooksRef = useRef<HTMLDivElement>(null);
  const activitiesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.currentTarget as HTMLElement;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        target.scrollLeft += e.deltaY;
      }
    };
    [hotBooksRef, activitiesRef].forEach((ref) => {
      const el = ref.current;
      if (el) {
        el.addEventListener('wheel', handleWheel, { passive: false });
      }
    });
    return () => {
      [hotBooksRef, activitiesRef].forEach((ref) => {
        const el = ref.current;
        if (el) {
          el.removeEventListener('wheel', handleWheel);
        }
      });
    };
  }, []);

  const topBooks = [...books]
    .sort((a, b) => b.reserveCount - a.reserveCount)
    .slice(0, 5);
  const upcomingActivities = activities.slice(0, 3);

  const handleReserve = async (bookId: string) => {
    if (!user) return;
    const result = await reserve(bookId, user.id);
    if (result.success) {
      refresh();
    } else {
      alert(result.message);
    }
  };

  const handleRegister = async (activityId: string) => {
    if (!user) return;
    const result = await register(activityId, user.id);
    if (!result.success) {
      alert(result.message);
    }
  };

  const styles = `
    .home-page {
      padding: 92px 32px 48px;
      max-width: 1280px;
      margin: 0 auto;
    }
    .home-hero {
      text-align: center;
      padding: 48px 0 32px;
    }
    .home-hero h1 {
      font-size: 36px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 12px;
    }
    .home-hero p {
      font-size: 16px;
      color: #6b7280;
    }
    .home-section {
      margin-top: 48px;
    }
    .home-section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .home-section-title h2 {
      font-size: 22px;
      font-weight: 700;
      color: #1f2937;
    }
    .home-section-title a {
      color: #8b5cf6;
      font-size: 14px;
      font-weight: 500;
    }
    .home-section-title a:hover {
      color: #7c3aed;
    }
    .scroll-container {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding: 8px 4px 16px;
      scroll-behavior: smooth;
    }
    .home-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: #6b7280;
      font-size: 14px;
    }
    @media (max-width: 768px) {
      .home-page {
        padding: 92px 16px 32px;
      }
      .home-hero h1 {
        font-size: 26px;
      }
      .home-hero p {
        font-size: 14px;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="home-page page-fade-in">
        <div className="home-hero">
          <h1>欢迎来到墨香书苑</h1>
          <p>发现好书，遇见知己，一起享受阅读的美好时光</p>
        </div>

        <div className="home-section">
          <div className="home-section-title">
            <h2>🔥 热门预约 Top5</h2>
            <a href="/books">查看全部 →</a>
          </div>
          {booksLoading ? (
            <div className="home-loading">加载中...</div>
          ) : (
            <div className="scroll-container hide-scrollbar" ref={hotBooksRef}>
              {topBooks.map((book, i) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onReserve={handleReserve}
                  delay={i * 80}
                />
              ))}
            </div>
          )}
        </div>

        <div className="home-section">
          <div className="home-section-title">
            <h2>📖 即将举办的读书会</h2>
            <a href="/activities">查看全部 →</a>
          </div>
          {activitiesLoading ? (
            <div className="home-loading">加载中...</div>
          ) : (
            <div className="scroll-container hide-scrollbar" ref={activitiesRef}>
              {upcomingActivities.map((activity, i) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onRegister={handleRegister}
                  size="small"
                  delay={i * 80}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
