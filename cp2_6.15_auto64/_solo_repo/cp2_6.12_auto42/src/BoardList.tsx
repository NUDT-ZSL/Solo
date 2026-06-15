import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  username: string;
}

interface Board {
  id: string;
  userId: string;
  name: string;
  coverImage: string;
  createdAt: number;
}

function BoardList({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCover, setNewCover] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/boards/${user.id}`)
      .then(res => res.json())
      .then(data => setBoards(data))
      .catch(() => {});
  }, [user.id]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: newName.trim(),
          coverImage: newCover.trim() || undefined,
        }),
      });
      const board = await res.json();
      setBoards(prev => [board, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewCover('');
    } catch {}
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={logoStyle}>🏠 灵感墙</h1>
        <div style={headerRightStyle}>
          <span style={userStyle}>{user.username}</span>
          <button onClick={onLogout} style={logoutBtnStyle}>退出</button>
        </div>
      </header>

      <div style={contentStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>我的看板</h2>
          <button onClick={() => setShowCreate(true)} style={addBtnStyle}>
            + 新建看板
          </button>
        </div>

        <div style={gridStyle}>
          {boards.map(board => (
            <div
              key={board.id}
              className="board-card"
              style={cardStyle}
              onClick={() => navigate(`/boards/${board.id}`)}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.transform = 'translateY(-5px)';
                el.style.boxShadow = '0 16px 48px rgba(59, 130, 246, 0.15), 0 4px 12px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.08), 0 2px 6px rgba(0,0,0,0.04)';
              }}
            >
              <div style={cardCoverStyle}>
                <img
                  src={board.coverImage}
                  alt={board.name}
                  style={cardImgStyle}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div style={cardOverlayStyle} />
              </div>
              <div style={cardInfoStyle}>
                <h3 style={cardNameStyle}>{board.name}</h3>
                <p style={cardDateStyle}>{new Date(board.createdAt).toLocaleDateString('zh-CN')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && (
        <div style={modalOverlayStyle} onClick={() => setShowCreate(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitleStyle}>新建看板</h3>
            <div style={formGroupStyle}>
              <label style={labelStyle}>看板名称</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="例如：北欧风格客厅"
                style={inputStyle}
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>封面图 URL（可选）</label>
              <input
                value={newCover}
                onChange={e => setNewCover(e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
            </div>
            <div style={modalBtnsStyle}>
              <button onClick={() => setShowCreate(false)} style={cancelBtnStyle}>取消</button>
              <button onClick={handleCreate} style={confirmBtnStyle}>创建</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .board-card {
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
      `}</style>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#F0F4F8',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 48px',
  backgroundColor: '#fff',
  borderBottom: '1px solid #e2e8f0',
};

const logoStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#1e293b',
};

const headerRightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const userStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
};

const logoutBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  backgroundColor: 'transparent',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#64748b',
  cursor: 'pointer',
};

const contentStyle: React.CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '32px 48px',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '28px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#1e293b',
};

const addBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#3B82F6',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '24px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(59, 130, 246, 0.08), 0 2px 6px rgba(0,0,0,0.04)',
};

const cardCoverStyle: React.CSSProperties = {
  width: '100%',
  height: '180px',
  position: 'relative',
  overflow: 'hidden',
};

const cardImgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const cardOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '50%',
  background: 'linear-gradient(transparent, rgba(0,0,0,0.3))',
};

const cardInfoStyle: React.CSSProperties = {
  padding: '16px',
};

const cardNameStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '4px',
};

const cardDateStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '16px',
  padding: '32px',
  width: '440px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '24px',
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 500,
  color: '#475569',
  marginBottom: '8px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
};

const modalBtnsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  marginTop: '24px',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: 'transparent',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#64748b',
  cursor: 'pointer',
};

const confirmBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#3B82F6',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

export default BoardList;
