import React from 'react';
import { NavLink } from 'react-router-dom';

interface HeaderProps {
  courseTitle?: string;
  filterTag: string;
  availableTags: string[];
  onFilterChange: (tag: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  courseTitle = '知识图谱学习平台',
  filterTag,
  availableTags,
  onFilterChange,
}) => {
  return (
    <header className="header">
      <h1 className="header-title">{courseTitle}</h1>
      <nav className="header-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          图谱
        </NavLink>
        <NavLink to="/users" className={({ isActive }) => (isActive ? 'active' : '')}>
          用户
        </NavLink>
      </nav>
      <select
        className="tag-filter-select"
        value={filterTag}
        onChange={e => onFilterChange(e.target.value)}
      >
        <option value="">全部标签</option>
        {availableTags.map(tag => (
          <option key={tag} value={tag}>
            #{tag}
          </option>
        ))}
      </select>
    </header>
  );
};
