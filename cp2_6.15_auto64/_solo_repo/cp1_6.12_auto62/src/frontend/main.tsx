import React from 'react';
import ReactDOM from 'react-dom/client';
import Editor from './components/Editor';
import Player from './components/Player';

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-primary: #1a2332;
    --bg-secondary: #243447;
    --bg-card: #ffffff;
    --text-primary: #ffffff;
    --text-secondary: #a0aec0;
    --text-dark: #1a2332;
    --accent-blue: #3b82f6;
    --accent-blue-hover: #2563eb;
    --accent-green: #22c55e;
    --accent-red: #ef4444;
    --border-color: #334155;
    --shadow: 0 4px 24px rgba(0,0,0,0.3);
    --radius: 12px;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    overflow-x: hidden;
  }

  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    z-index: 1000;
  }

  .navbar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    text-decoration: none;
  }

  .navbar-logo svg {
    width: 28px;
    height: 28px;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-link {
    padding: 8px 18px;
    border-radius: 8px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    background: none;
  }

  .nav-link:hover { color: var(--text-primary); background: rgba(255,255,255,0.06); }
  .nav-link.active { color: var(--accent-blue); background: rgba(59,130,246,0.12); }

  .nav-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    margin-left: 16px;
  }

  .app-content {
    margin-top: 56px;
    min-height: calc(100vh - 56px);
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary { background: var(--accent-blue); color: #fff; }
  .btn-primary:hover { background: var(--accent-blue-hover); transform: scale(1.02); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); }
  .btn-secondary:hover { background: var(--border-color); }

  .btn-success { background: var(--accent-green); color: #fff; }
  .btn-success:hover { opacity: 0.9; }

  .btn-danger { background: var(--accent-red); color: #fff; }
  .btn-danger:hover { opacity: 0.9; }

  .input {
    padding: 10px 14px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }

  .input:focus { border-color: var(--accent-blue); }

  .toast {
    position: fixed;
    top: 72px;
    right: 24px;
    padding: 12px 20px;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    animation: toastIn 0.3s ease;
  }

  .toast-success { background: var(--accent-green); }
  .toast-error { background: var(--accent-red); }

  @keyframes toastIn {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;

function App() {
  const [page, setPage] = React.useState<'editor' | 'player'>('editor');
  const [currentVideoId, setCurrentVideoId] = React.useState<string | null>(null);

  const handleOpenPlayer = (videoId: string) => {
    setCurrentVideoId(videoId);
    setPage('player');
  };

  const handleBackToEditor = () => {
    setPage('editor');
  };

  return (
    <>
      <style>{styles}</style>
      <nav className="navbar">
        <div className="navbar-logo">
          <svg viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#3b82f6"/>
            <path d="M8 8h12v2H8zM8 13h8v2H8zM8 18h10v2H8z" fill="#fff"/>
            <circle cx="22" cy="18" r="4" fill="#fbbf24"/>
            <text x="22" y="20" textAnchor="middle" fill="#1a2332" fontSize="6" fontWeight="700">?</text>
          </svg>
          QuizCraft
        </div>
        <div className="nav-links">
          <button className={`nav-link ${page === 'editor' ? 'active' : ''}`} onClick={handleBackToEditor}>
            课件编辑
          </button>
          <button className={`nav-link ${page === 'player' ? 'active' : ''}`} onClick={() => currentVideoId && setPage('player')} disabled={!currentVideoId}>
            学生播放
          </button>
        </div>
        <div className="nav-avatar">T</div>
      </nav>
      <div className="app-content">
        {page === 'editor' ? (
          <Editor onOpenPlayer={handleOpenPlayer} currentVideoId={currentVideoId} />
        ) : currentVideoId ? (
          <Player videoId={currentVideoId} onBack={handleBackToEditor} />
        ) : null}
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
