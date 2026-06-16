import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showUploadButton?: boolean;
  onUploadClick?: () => void;
  showUploadForm?: boolean;
  matchCount?: number;
  onScoreAdded?: () => void;
}

export default function Header({
  showSearch = false,
  searchValue = '',
  onSearchChange,
  showUploadButton = false,
  onUploadClick,
  showUploadForm = false,
  matchCount,
}: HeaderProps) {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    const isHome = window.location.pathname === '/';
    if (isHome) {
      if (onSearchChange) {
        onSearchChange('');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  return (
    <header
      style={{
        padding: '40px 120px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }}
    >
      <h1
        className="serif"
        onClick={handleLogoClick}
        style={{
          fontSize: '36px',
          color: '#b8860b',
          fontWeight: 700,
          letterSpacing: '1px',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'opacity 0.2s',
          margin: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        title="点击返回首页"
      >
        乐谱集市
      </h1>
      <p style={{ color: '#888', fontSize: '14px', marginTop: '-12px', margin: 0 }}>
        发现闲置乐谱，让音乐继续流淌
      </p>

      {showSearch && (
        <div style={{ position: 'relative', width: '400px' }}>
          <input
            type="text"
            placeholder="搜索乐谱标题或作曲家..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            style={{
              width: '400px',
              height: '44px',
              borderRadius: '22px',
              border: '2px solid #d4c5a9',
              padding: '0 24px',
              fontSize: '15px',
              backgroundColor: '#ffffff',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              color: '#333',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#b8860b')}
            onBlur={(e) => (e.target.style.borderColor = '#d4c5a9')}
          />
        </div>
      )}

      {showUploadButton && matchCount !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            找到 <strong style={{ color: '#b8860b' }}>{matchCount}</strong> 个乐谱
          </span>
          <button
            onClick={onUploadClick}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              backgroundColor: '#b8860b',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background-color 0.2s',
              boxShadow: '0 2px 6px rgba(184,134,11,0.3)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8b6914')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#b8860b')}
          >
            {showUploadForm ? '取消上传' : '上传乐谱'}
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          header {
            padding: 24px 20px 16px !important;
          }
          header input {
            width: 100% !important;
            max-width: 350px;
          }
          header > div:first-of-type {
            width: 100% !important;
            max-width: 350px;
          }
        }
      `}</style>
    </header>
  );
}
