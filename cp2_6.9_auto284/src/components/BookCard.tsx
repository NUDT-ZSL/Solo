import React, { useState } from 'react';

interface Book {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  status: 'not_started' | 'in_progress' | 'completed';
  createdAt: string;
}

interface BookCardProps {
  book: Book;
  onUpdateProgress: (id: string, page: number) => void;
  onMarkComplete: (id: string) => void;
}

const statusColorMap: Record<Book['status'], string> = {
  in_progress: '#C8A97E',
  completed: '#9BBC8A',
  not_started: '#D0C8B0',
};

const BookCard: React.FC<BookCardProps> = ({ book, onUpdateProgress, onMarkComplete }) => {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newPage, setNewPage] = useState('');
  const [showCompletionToast, setShowCompletionToast] = useState(false);

  const progress = book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0;

  const getGradientStyle = () => {
    if (book.status === 'completed') {
      return { background: 'linear-gradient(90deg, #9BBC8A, #7A9A6A)' };
    }
    if (book.status === 'in_progress') {
      return { background: 'linear-gradient(90deg, #C8A97E, #B8965E)' };
    }
    return { background: '#D0C8B0' };
  };

  const handleConfirmUpdate = () => {
    const page = parseInt(newPage, 10);
    if (!isNaN(page) && page >= 0 && page <= book.totalPages) {
      onUpdateProgress(book.id, page);
      setShowUpdateModal(false);
      setNewPage('');
      if (page >= book.totalPages) {
        setShowCompletionToast(true);
        setTimeout(() => setShowCompletionToast(false), 3000);
      }
    }
  };

  const handleMarkComplete = () => {
    onMarkComplete(book.id);
    setShowCompletionToast(true);
    setTimeout(() => setShowCompletionToast(false), 3000);
  };

  return (
    <>
      <div style={cardStyle}>
        <div
          style={{
            ...statusBarStyle,
            backgroundColor: statusColorMap[book.status],
          }}
        />
        <div style={contentStyle}>
          <div style={textSectionStyle}>
            <div style={titleStyle}>{book.title}</div>
            <div style={authorStyle}>{book.author}</div>
            <div style={progressBarContainerStyle}>
              <div style={{ ...progressBarFillStyle, width: `${progress}%`, ...getGradientStyle() }} />
            </div>
            <div style={pageCountStyle}>
              {book.currentPage} / {book.totalPages} 页
            </div>
          </div>
          <div style={buttonSectionStyle}>
            <button
              style={updateBtnStyle}
              onClick={() => setShowUpdateModal(true)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C8B89A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E0D0B5')}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              更新进度
            </button>
            <button
              style={completeBtnStyle}
              onClick={handleMarkComplete}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9DBB9D')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#B5C8B5')}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              标记完成
            </button>
          </div>
        </div>
        {showCompletionToast && <div style={toastStyle}>恭喜完成！</div>}
      </div>

      {showUpdateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowUpdateModal(false)}>
          <div style={updateModalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={updateModalTitleStyle}>更新阅读进度</div>
            <input
              type="number"
              placeholder="输入当前页数"
              value={newPage}
              onChange={(e) => setNewPage(e.target.value)}
              style={updateInputStyle}
              min={0}
              max={book.totalPages}
            />
            <div style={{ color: '#8A7A6A', fontSize: '12px', marginTop: '8px' }}>
              共 {book.totalPages} 页
            </div>
            <button style={confirmBtnStyle} onClick={handleConfirmUpdate}>
              确认
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const cardStyle: React.CSSProperties = {
  position: 'relative',
  height: '100px',
  margin: '6px 0',
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  display: 'flex',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(201, 193, 169, 0.15)',
};

const statusBarStyle: React.CSSProperties = {
  width: '4px',
  flexShrink: 0,
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  padding: '12px 16px',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
};

const textSectionStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#3A2A1A',
  marginBottom: '4px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const authorStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#8A7A6A',
  marginBottom: '8px',
};

const progressBarContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  backgroundColor: '#E8E0D0',
  borderRadius: '3px',
  overflow: 'hidden',
  marginBottom: '4px',
};

const progressBarFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '3px',
  transition: 'width 0.3s ease',
};

const pageCountStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#8A7A6A',
};

const buttonSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  flexShrink: 0,
};

const updateBtnStyle: React.CSSProperties = {
  width: '72px',
  height: '28px',
  borderRadius: '6px',
  backgroundColor: '#E0D0B5',
  color: '#5A4A3A',
  fontSize: '12px',
  border: 'none',
  cursor: 'pointer',
  fontFamily: "'Noto Serif SC', serif",
  transition: 'background-color 0.2s, transform 0.2s',
};

const completeBtnStyle: React.CSSProperties = {
  width: '72px',
  height: '28px',
  borderRadius: '6px',
  backgroundColor: '#B5C8B5',
  color: '#3A5A3A',
  fontSize: '12px',
  border: 'none',
  cursor: 'pointer',
  fontFamily: "'Noto Serif SC', serif",
  transition: 'background-color 0.2s, transform 0.2s',
};

const toastStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '100%',
  backgroundColor: '#D4EDD4',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#3A5A3A',
  fontSize: '16px',
  fontWeight: 600,
  animation: 'toastAnimation 3s ease-in-out forwards',
  pointerEvents: 'none',
};

const modalOverlayStyle: React.CSSProperties = {
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

const updateModalStyle: React.CSSProperties = {
  width: '300px',
  height: '200px',
  borderRadius: '14px',
  backgroundColor: '#FFFFFF',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
};

const updateModalTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#3A2A1A',
};

const updateInputStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  borderRadius: '8px',
  border: '1px solid #DBCBA9',
  padding: '0 12px',
  fontSize: '14px',
  fontFamily: "'Noto Serif SC', serif",
  outline: 'none',
};

const confirmBtnStyle: React.CSSProperties = {
  width: '100px',
  height: '36px',
  borderRadius: '6px',
  backgroundColor: '#C8A97E',
  color: '#FFFFFF',
  fontSize: '14px',
  border: 'none',
  cursor: 'pointer',
  fontFamily: "'Noto Serif SC', serif",
  marginTop: '8px',
};

export default BookCard;
