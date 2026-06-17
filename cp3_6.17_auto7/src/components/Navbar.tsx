import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { ChefHat, LogOut, Menu, X } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function Navbar({ onToggleSidebar, sidebarOpen }: NavbarProps) {
  const { user, logout } = useApi();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleMobileToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    onToggleSidebar?.();
  };

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={handleMobileToggle}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            marginRight: 8,
          }}
          className="mobile-menu-btn"
        >
          {sidebarOpen || mobileMenuOpen ? (
            <X size={24} style={{ color: 'var(--secondary)' }} />
          ) : (
            <Menu size={24} style={{ color: 'var(--secondary)' }} />
          )}
        </button>
        <ChefHat size={28} style={{ color: '#f5deb3' }} />
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#8b4513',
          }}
        >
          RecipeGit
        </span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && (
          <>
            <span style={{ fontSize: 14, color: '#555', fontWeight: 500 }}>
              {user.username}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 14,
              }}
            >
              <LogOut size={16} />
              登出
            </button>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </nav>
  );
}
