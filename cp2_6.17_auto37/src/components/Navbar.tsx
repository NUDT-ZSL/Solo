import { useState } from 'react';
import { Plus, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const navbarStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-primary)',
  color: 'white',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '16px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const logoStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '24px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const logoDotStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: '#d4a574',
};

const navActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const createButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: 'rgba(255,255,255,0.15)',
  color: 'white',
  border: '1px solid rgba(255,255,255,0.3)',
  padding: '8px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.2s ease',
};

const hamburgerStyle: React.CSSProperties = {
  display: 'none',
  backgroundColor: 'transparent',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  padding: '4px',
};

const mobileMenuStyle: React.CSSProperties = {
  display: 'none',
  flexDirection: 'column',
  gap: '16px',
  padding: '16px 24px',
  backgroundColor: 'var(--color-primary-dark)',
  borderTop: '1px solid rgba(255,255,255,0.1)',
};

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCreate = () => {
    navigate('/create');
    setMenuOpen(false);
  };

  const handleLogoClick = () => {
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav style={navbarStyle}>
      <div style={containerStyle}>
        <div style={logoStyle} onClick={handleLogoClick}>
          <span style={logoDotStyle}></span>
          烘焙工坊
        </div>

        <div style={navActionsStyle}>
          <button style={createButtonStyle} onClick={handleCreate}>
            <Plus size={18} />
            <span>创建</span>
          </button>

          <button
            style={hamburgerStyle}
            className="hamburger-btn"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div style={mobileMenuStyle} className="mobile-menu">
          <button style={createButtonStyle} onClick={handleCreate}>
            <Plus size={18} />
            <span>创建新记录</span>
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .hamburger-btn {
            display: block !important;
          }
          .mobile-menu {
            display: flex !important;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
