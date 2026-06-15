import { NavLink, useNavigate } from 'react-router-dom';
import { useGalleryStore } from '@/hooks/useGalleryStore';

export default function Navbar() {
  const navigate = useNavigate();
  const isAutoTouring = useGalleryStore((s) => s.isAutoTouring);
  const setAutoTouring = useGalleryStore((s) => s.setAutoTouring);

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>
        <div className="navbar-brand-mark">艺</div>
        <span>艺境回廊</span>
      </div>

      <div className="navbar-right">
        <div className="tour-toggle-group">
          <span className="tour-toggle-label">自动巡游</span>
          <div
            className={`toggle-switch ${isAutoTouring ? 'active' : ''}`}
            onClick={() => setAutoTouring(!isAutoTouring)}
            role="switch"
            aria-checked={isAutoTouring}
          />
        </div>
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          回廊展厅
        </NavLink>
        <NavLink to="/featured" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          热门分享
        </NavLink>
      </div>
    </nav>
  );
}
