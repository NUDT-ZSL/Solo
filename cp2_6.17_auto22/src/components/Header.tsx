import { NavLink } from 'react-router-dom';

export default function Header() {
  return (
    <header className="header">
      <div className="logo">🎵 SoundVerse</div>
      <nav className="nav-links">
        <NavLink to="/" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} end>
          首页
        </NavLink>
        <NavLink to="/tour" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          巡演规划
        </NavLink>
      </nav>
    </header>
  );
}
