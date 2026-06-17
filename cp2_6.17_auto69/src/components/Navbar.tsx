import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

function createRipple(event: React.MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
  circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
  circle.classList.add('ripple');

  const ripple = button.getElementsByClassName('ripple')[0];
  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);

  setTimeout(() => circle.remove(), 600);
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/session', label: '游戏桌' },
    { path: '/player', label: '个人中心' },
    { path: '/rankings', label: '热门排行' }
  ];

  const isActive = (path: string) => {
    if (path === '/player') {
      return location.pathname.startsWith('/player');
    }
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">桌游吧</div>
      <div className={`navbar-nav ${menuOpen ? 'open' : ''}`}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <button
        className="hamburger"
        onClick={(e) => {
          createRipple(e);
          setMenuOpen(!menuOpen);
        }}
      >
        <span />
        <span />
        <span />
      </button>
    </nav>
  );
}
