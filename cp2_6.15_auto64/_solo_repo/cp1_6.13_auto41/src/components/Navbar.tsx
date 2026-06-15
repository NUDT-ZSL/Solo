import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onProfileClick: () => void;
}

export function Navbar({ searchQuery, onSearchChange, onProfileClick }: NavbarProps) {
  const location = useLocation();
  const isDetailPage = location.pathname.startsWith('/recipe/');

  return (
    <nav className="navbar-glass">
      <div className="navbar-inner">
        <Link to="/" className="app-logo">
          RecipeVault
        </Link>

        {!isDetailPage && (
          <div className="search-box">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="搜索菜谱、食材、菜系..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        <div className="navbar-right">
          <button
            className="profile-btn"
            onClick={onProfileClick}
            title="个人中心"
          >
            R
          </button>
        </div>
      </div>
    </nav>
  );
}
