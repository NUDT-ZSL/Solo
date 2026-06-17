import React from 'react';
import type { KnowledgePoint } from '../types';

interface HeaderProps {
  courseTitle: string;
  knowledgePoints: KnowledgePoint[];
  allTags: string[];
  filterTag: string;
  onFilterChange: (tag: string) => void;
  currentPage: 'map' | 'users';
  onNavigate: (page: 'map' | 'users') => void;
}

const Header: React.FC<HeaderProps> = ({
  courseTitle,
  allTags,
  filterTag,
  onFilterChange,
  currentPage,
  onNavigate,
}) => {
  return (
    <nav className="nav-bar">
      <div className="nav-title">知链图谱 · 知识复习系统</div>

      <div
        style={{
          marginLeft: 20,
          paddingLeft: 20,
          borderLeft: '1px solid #e0e0e0',
          fontSize: 14,
          color: '#616161',
          maxWidth: 240,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={courseTitle}
      >
        📚 {courseTitle}
      </div>

      <div className="nav-spacer" />

      {currentPage === 'map' && (
        <div className="nav-filter">
          <label htmlFor="tag-filter">标签过滤:</label>
          <select
            id="tag-filter"
            value={filterTag}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            <option value="all">全部显示</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginLeft: 12, display: 'flex', gap: 6 }}>
        <button
          className={`nav-link ${currentPage === 'map' ? 'active' : ''}`}
          onClick={() => onNavigate('map')}
        >
          知识图谱
        </button>
        <button
          className={`nav-link ${currentPage === 'users' ? 'active' : ''}`}
          onClick={() => onNavigate('users')}
        >
          用户管理
        </button>
      </div>
    </nav>
  );
};

export default Header;
