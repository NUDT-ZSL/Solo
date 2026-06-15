import { Code2 } from 'lucide-react';

interface NavbarProps {
  activePage: 'gallery' | 'heatmap';
  onNavigate: (page: 'gallery' | 'heatmap') => void;
}

export default function Navbar({ activePage, onNavigate }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Code2 size={24} />
        <span>CodeMosaic</span>
      </div>
      <div className="navbar-links">
        <button
          className={`navbar-link ${activePage === 'gallery' ? 'active' : ''}`}
          onClick={() => onNavigate('gallery')}
        >
          画廊
        </button>
        <button
          className={`navbar-link ${activePage === 'heatmap' ? 'active' : ''}`}
          onClick={() => onNavigate('heatmap')}
        >
          热力图
        </button>
      </div>
    </nav>
  );
}
