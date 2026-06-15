import React, { useState, useEffect, useCallback } from 'react';
import BookCard from './components/BookCard';
import StatsPanel from './components/StatsPanel';
import WeeklyReport from './components/WeeklyReport';

interface Book {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  status: 'not_started' | 'in_progress' | 'completed';
  createdAt: string;
}

interface Stats {
  daysReadThisWeek: number;
  totalPagesThisWeek: number;
  avgMinutesPerDay: number;
  booksReadThisWeek: number;
  dailyPagesThisWeek: number[];
}

interface WeeklyReportData {
  summary: string;
  dailyPages: number[];
  bookShares: { title: string; pages: number }[];
  generated: string;
}

interface StatsResponse {
  stats: Stats;
  weeklyReport: WeeklyReportData;
}

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [hasNewReport, setHasNewReport] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newPageInput, setNewPageInput] = useState('');

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error('获取书单失败:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data: StatsResponse = await res.json();
      setStats(data.stats);
      setWeeklyReport(data.weeklyReport);
      const now = new Date();
      const reportDate = new Date(data.weeklyReport.generated);
      const diffHours = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60);
      if (diffHours < 24) {
        setHasNewReport(true);
      }
    } catch (err) {
      console.error('获取统计数据失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
    fetchStats();
  }, [fetchBooks, fetchStats]);

  const handleAddBook = async () => {
    if (!newTitle.trim() || !newAuthor.trim()) return;
    let currentPage = 0;
    let totalPages = 0;
    if (newPageInput.includes('/')) {
      const [cp, tp] = newPageInput.split('/').map((s) => parseInt(s.trim(), 10));
      currentPage = isNaN(cp) ? 0 : cp;
      totalPages = isNaN(tp) ? 0 : tp;
    }
    if (!totalPages) return;

    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          author: newAuthor.trim(),
          currentPage,
          totalPages,
        }),
      });
      if (res.ok) {
        setNewTitle('');
        setNewAuthor('');
        setNewPageInput('');
        setShowAddModal(false);
        await fetchBooks();
        await fetchStats();
      }
    } catch (err) {
      console.error('添加书籍失败:', err);
    }
  };

  const handleUpdateProgress = async (id: string, page: number) => {
    try {
      await fetch(`/api/books/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPage: page }),
      });
      await fetchBooks();
      await fetchStats();
    } catch (err) {
      console.error('更新进度失败:', err);
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await fetch(`/api/books/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      await fetchBooks();
      await fetchStats();
    } catch (err) {
      console.error('标记完成失败:', err);
    }
  };

  const handleBellClick = () => {
    setShowWeeklyReport(true);
    setHasNewReport(false);
  };

  const inProgressBooks = books.filter((b) => b.status !== 'completed');
  const totalInProgressPages = inProgressBooks.reduce((sum, b) => sum + b.totalPages, 0);
  const totalReadPages = inProgressBooks.reduce((sum, b) => sum + b.currentPage, 0);
  const overallProgress = totalInProgressPages > 0 ? (totalReadPages / totalInProgressPages) * 100 : 0;
  const streakDays = stats?.daysReadThisWeek || 0;

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (overallProgress / 100) * circumference;

  return (
    <>
      <style>{`
        @keyframes expandDown {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        @keyframes toastAnimation {
          0% { opacity: 0; transform: translateY(20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        @media (max-width: 768px) {
          .main-card { width: 100% !important; margin: 12px !important; padding: 20px 16px !important; }
          .book-list { width: 100% !important; padding: 0 12px !important; }
          .stats-panel { width: 100% !important; right: 0 !important; }
          .title-text { font-size: 14.4px !important; }
          .author-text { font-size: 11.7px !important; }
        }
        .book-list-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .book-list-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .book-list-scroll::-webkit-scrollbar-thumb {
          background: #D0C8B0;
          border-radius: 3px;
        }
      `}</style>

      <div style={pageStyle}>
        <div className="main-card" style={mainCardStyle}>
          <div style={cardHeaderStyle}>
            <button style={bellBtnStyle} onClick={handleBellClick}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {hasNewReport && <span style={bellDotStyle} />}
            </button>
            <div style={userInfoStyle}>
              <div style={avatarStyle}>书</div>
              <span style={userNameStyle}>书虫读者</span>
            </div>
          </div>

          <div style={readingSectionStyle}>
            <div style={streakSectionStyle}>
              <div style={{ fontSize: '13px', color: '#8A7A6A', marginBottom: '4px' }}>连续阅读</div>
              <div style={streakDaysStyle}>
                {streakDays}
                <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '4px' }}>天</span>
              </div>
              <div style={{ fontSize: '12px', color: '#8A7A6A', marginTop: '4px' }}>今日阅读</div>
            </div>

            <div style={progressRingWrapperStyle}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <defs>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C8A97E" />
                    <stop offset="100%" stopColor="#B8965E" />
                  </linearGradient>
                </defs>
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="#E8E0D0"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="url(#ringGradient)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div style={progressRingTextStyle}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#5A4A3A' }}>
                  {totalReadPages}/{totalInProgressPages}
                </div>
                <div style={{ fontSize: '10px', color: '#8A7A6A' }}>页</div>
              </div>
            </div>
          </div>

          <div style={addBtnWrapperStyle}>
            <button
              style={addBtnStyle}
              onClick={() => setShowAddModal(true)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B8965E')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#C8A97E')}
            >
              + 添加一本书
            </button>
          </div>
        </div>

        <div className="book-list" style={bookListContainerStyle}>
          <div className="book-list-scroll" style={bookListScrollStyle}>
            {books.length === 0 ? (
              <div style={emptyListStyle}>还没有书籍，点击上方按钮添加第一本吧~</div>
            ) : (
              books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onUpdateProgress={handleUpdateProgress}
                  onMarkComplete={handleMarkComplete}
                />
              ))
            )}
          </div>
        </div>

        <button
          style={floatBtnStyle}
          onClick={() => setShowStatsPanel(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.width = '52px';
            e.currentTarget.style.height = '52px';
            e.currentTarget.style.transform = 'rotate(15deg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.width = '48px';
            e.currentTarget.style.height = '48px';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </button>
      </div>

      {showAddModal && (
        <div style={addModalOverlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={addModalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={addModalTitleStyle}>添加新书</div>
            <input
              type="text"
              placeholder="如《百年孤独》"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={addInputStyle}
            />
            <input
              type="text"
              placeholder="作者"
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              style={addInputStyle}
            />
            <input
              type="text"
              placeholder="当前页数/总页数 如 25/300"
              value={newPageInput}
              onChange={(e) => setNewPageInput(e.target.value)}
              style={addInputStyle}
            />
            <button
              style={startReadingBtnStyle}
              onClick={handleAddBook}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8DB4A0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#A7C4B5')}
            >
              开始阅读
            </button>
          </div>
        </div>
      )}

      <StatsPanel
        isOpen={showStatsPanel}
        onClose={() => setShowStatsPanel(false)}
        stats={stats}
      />

      <WeeklyReport
        isOpen={showWeeklyReport}
        onClose={() => setShowWeeklyReport(false)}
        report={weeklyReport}
      />
    </>
  );
};

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#FBF8F0',
  padding: '40px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const mainCardStyle: React.CSSProperties = {
  width: '900px',
  backgroundColor: '#F0EBE0',
  borderRadius: '20px',
  padding: '32px 40px',
  boxShadow: '0 4px 20px rgba(201, 193, 169, 0.3)',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '28px',
};

const bellBtnStyle: React.CSSProperties = {
  position: 'relative',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: '#C8A97E',
  color: '#FFFFFF',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const bellDotStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-2px',
  right: '-2px',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#D9534F',
};

const userInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const avatarStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: '#C8A97E',
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
  fontWeight: 600,
  border: '1.5px solid #DBCBA9',
};

const userNameStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 500,
  color: '#3A2A1A',
};

const readingSectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  marginBottom: '32px',
  padding: '16px 0',
};

const streakSectionStyle: React.CSSProperties = {
  textAlign: 'center',
};

const streakDaysStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#5A4A3A',
};

const progressRingWrapperStyle: React.CSSProperties = {
  position: 'relative',
  width: '80px',
  height: '80px',
};

const progressRingTextStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
};

const addBtnWrapperStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
};

const addBtnStyle: React.CSSProperties = {
  width: '160px',
  height: '44px',
  borderRadius: '22px',
  backgroundColor: '#C8A97E',
  color: '#FFFFFF',
  fontSize: '15px',
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
  fontFamily: "'Noto Serif SC', serif",
  transition: 'background-color 0.3s',
};

const bookListContainerStyle: React.CSSProperties = {
  width: '900px',
  marginTop: '24px',
};

const bookListScrollStyle: React.CSSProperties = {
  maxHeight: '400px',
  overflowY: 'auto',
  padding: '4px 0',
};

const emptyListStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 0',
  color: '#8A7A6A',
  fontSize: '14px',
};

const floatBtnStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '32px',
  right: '32px',
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: '#C8A97E',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(200, 169, 126, 0.4)',
  transition: 'width 0.3s, height 0.3s, transform 0.3s',
  zIndex: 997,
};

const addModalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#00000040',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const addModalStyle: React.CSSProperties = {
  width: '420px',
  borderRadius: '16px',
  backgroundColor: '#FFFFFF',
  padding: '32px 28px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const addModalTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#3A2A1A',
  marginBottom: '8px',
  textAlign: 'center',
};

const addInputStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  borderRadius: '10px',
  border: '1px solid #DBCBA9',
  padding: '0 16px',
  fontSize: '14px',
  fontFamily: "'Noto Serif SC', serif",
  outline: 'none',
};

const startReadingBtnStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  borderRadius: '8px',
  backgroundColor: '#A7C4B5',
  color: '#FFFFFF',
  fontSize: '15px',
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
  fontFamily: "'Noto Serif SC', serif",
  marginTop: '8px',
  transition: 'background-color 0.3s',
};

export default App;
