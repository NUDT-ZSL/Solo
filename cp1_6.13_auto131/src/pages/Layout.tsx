import { Outlet, Link, useLocation } from 'react-router-dom';
import { Plus, Menu, X } from 'lucide-react';
import { useState } from 'react';

const layoutStyles = `
  .layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: #1e293b;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    z-index: 100;
    border-bottom: 1px solid #334155;
  }

  .navbar-brand {
    font-size: 20px;
    font-weight: 700;
    color: #e2e8f0;
    letter-spacing: -0.3px;
  }

  .navbar-brand span {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .navbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .add-btn {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: none;
    overflow: hidden;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }

  .add-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
  }

  .add-btn:active {
    transform: scale(0.95);
  }

  .add-btn .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    animation: ripple 0.6s linear;
    pointer-events: none;
  }

  .hamburger-btn {
    display: none;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: #334155;
    color: #e2e8f0;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: none;
    transition: background 0.15s ease;
  }

  .hamburger-btn:hover {
    background: #475569;
  }

  .mobile-menu {
    display: none;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    padding: 16px 24px;
    z-index: 99;
    flex-direction: column;
    gap: 12px;
    animation: slideDown 0.2s ease;
  }

  .mobile-menu.open {
    display: flex;
  }

  .mobile-menu a {
    padding: 10px 16px;
    border-radius: 8px;
    color: #e2e8f0;
    font-weight: 500;
    transition: background 0.15s ease;
  }

  .mobile-menu a:hover {
    background: #334155;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 480px) {
    .hamburger-btn {
      display: flex;
    }

    .navbar-actions .add-btn-text {
      display: none;
    }

    .mobile-menu.open {
      display: flex;
    }
  }

  .main-content {
    flex: 1;
    padding: 80px 24px 24px;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }

  @media (max-width: 480px) {
    .main-content {
      padding: 72px 16px 16px;
    }
  }
`;

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const handleAddClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = '10px';
    ripple.style.left = `${x - 5}px`;
    ripple.style.top = `${y - 5}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  return (
    <>
      <style>{layoutStyles}</style>
      <div className="layout">
        <nav className="navbar">
          <Link to="/" className="navbar-brand">
            Code<span>SnippetVault</span>
          </Link>

          <div className="navbar-actions">
            <Link to="/add">
              <button className="add-btn" onClick={handleAddClick}>
                <Plus size={20} />
              </button>
            </Link>
            <button
              className="hamburger-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>
            首页
          </Link>
          <Link to="/add" onClick={() => setMenuOpen(false)}>
            添加片段
          </Link>
        </div>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
