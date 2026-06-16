import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { Tag } from '../business/types';

interface HeaderProps {
  tags: Tag[];
  selectedTag: string;
  onTagChange: (tag: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: 'default' | 'rating-desc' | 'rating-asc';
  onSortChange: (s: 'default' | 'rating-desc' | 'rating-asc') => void;
  showFilters?: boolean;
}

const ALL_TAGS_OPTION = '__all__';

export default function Header({
  tags,
  selectedTag,
  onTagChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  showFilters = true,
}: HeaderProps) {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isGallery = location.pathname === '/';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const displayTag =
    selectedTag === ALL_TAGS_OPTION || !selectedTag ? '全部标签' : selectedTag;

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="logo" onClick={() => setMobileOpen(false)}>
            独立游戏<span>聚合</span>
          </NavLink>

          <nav className="nav-links">
            <NavLink to="/" end className="nav-link">
              作品集
            </NavLink>
            <NavLink to="/ranking" className="nav-link">
              排行
            </NavLink>
          </nav>

          {showFilters && isGallery && (
            <div className="header-filters">
              <div className="tag-select" ref={dropdownRef}>
                <button
                  type="button"
                  className="tag-select-trigger"
                  onClick={() => setDropdownOpen((v) => !v)}
                >
                  {displayTag}
                </button>
                {dropdownOpen && (
                  <div className="tag-select-dropdown">
                    <button
                      type="button"
                      className={`tag-option ${selectedTag === ALL_TAGS_OPTION ? 'active' : ''}`}
                      onClick={() => {
                        onTagChange(ALL_TAGS_OPTION);
                        setDropdownOpen(false);
                      }}
                    >
                      全部
                    </button>
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`tag-option ${selectedTag === tag ? 'active' : ''}`}
                        onClick={() => {
                          onTagChange(tag);
                          setDropdownOpen(false);
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                className="search-input"
                placeholder="搜索游戏名称"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />

              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as typeof sortBy)}
              >
                <option value="default">默认排序</option>
                <option value="rating-desc">评分从高到低</option>
                <option value="rating-asc">评分从低到高</option>
              </select>
            </div>
          )}

          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="菜单"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-menu open">
          <nav className="nav-links">
            <NavLink to="/" end className="nav-link">
              作品集
            </NavLink>
            <NavLink to="/ranking" className="nav-link">
              排行
            </NavLink>
          </nav>

          {showFilters && isGallery && (
            <div className="header-filters">
              <div className="tag-select">
                <button
                  type="button"
                  className="tag-select-trigger"
                  onClick={() => setDropdownOpen((v) => !v)}
                >
                  {displayTag}
                </button>
                {dropdownOpen && (
                  <div className="tag-select-dropdown">
                    <button
                      type="button"
                      className={`tag-option ${selectedTag === ALL_TAGS_OPTION ? 'active' : ''}`}
                      onClick={() => {
                        onTagChange(ALL_TAGS_OPTION);
                        setDropdownOpen(false);
                      }}
                    >
                      全部
                    </button>
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`tag-option ${selectedTag === tag ? 'active' : ''}`}
                        onClick={() => {
                          onTagChange(tag);
                          setDropdownOpen(false);
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                className="search-input"
                placeholder="搜索游戏名称"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />

              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as typeof sortBy)}
              >
                <option value="default">默认排序</option>
                <option value="rating-desc">评分从高到低</option>
                <option value="rating-asc">评分从低到高</option>
              </select>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export { ALL_TAGS_OPTION };
