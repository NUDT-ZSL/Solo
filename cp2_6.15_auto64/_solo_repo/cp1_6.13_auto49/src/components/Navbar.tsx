
import { useState, useEffect } from 'react';

interface NavbarProps {
  onUploadClick: () => void;
  onSearch: (term: string) => void;
}

export default function Navbar({ onUploadClick, onSearch }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isBtnHovered, setIsBtnHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch(value);
  };

  return (
    <nav
      className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: 'rgba(17, 24, 39, 0.88)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        zIndex: 100,
        transition: 'box-shadow 0.3s ease',
      }}
    >
      <div
        style={{
          fontSize: '22px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.5px',
        }}
      >
        GradientGallery
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: 'absolute',
              left: '14px',
              color: '#9ca3af',
              pointerEvents: 'none',
            }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="搜索作品或标签..."
            value={searchValue}
            onChange={handleSearchChange}
            style={{
              width: '260px',
              height: '36px',
              padding: '0 14px 0 38px',
              border: 'none',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              fontSize: '14px',
              color: '#4b5563',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
          />
        </div>

        <button
          onClick={onUploadClick}
          onMouseEnter={() => setIsBtnHovered(true)}
          onMouseLeave={() => setIsBtnHovered(false)}
          style={{
            height: '36px',
            padding: '0 20px',
            border: 'none',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: isBtnHovered
              ? '0 4px 16px rgba(16, 185, 129, 0.4)'
              : '0 2px 8px rgba(16, 185, 129, 0.3)',
            transform: isBtnHovered ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.2s ease',
          }}
        >
          + 上传
        </button>
      </div>
    </nav>
  );
}
