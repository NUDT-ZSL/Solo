import React, { useState } from 'react';

export type FilterType = 'all' | 'pending' | 'replied' | 'urgent';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onAddClick: () => void;
}

const filterTabs: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'replied', label: '已回复' },
  { key: 'urgent', label: '紧急' },
];

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onAddClick,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleFilterClick = (filter: FilterType) => {
    onFilterChange(filter);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div className="search-bar">
        <button
          className="hamburger-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="打开菜单"
        >
          ☰
        </button>
        <input
          type="text"
          className="search-input"
          placeholder="搜索反馈标题或描述..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="filter-tabs">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
              onClick={() => onFilterChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          <div className="mobile-menu-header">
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>菜单</h3>
            <button
              className="mobile-menu-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="关闭菜单"
            >
              ×
            </button>
          </div>
          <div className="mobile-filter-tabs">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                className={`filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
                onClick={() => handleFilterClick(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            className="mobile-add-btn"
            onClick={() => {
              setMobileMenuOpen(false);
              onAddClick();
            }}
          >
            + 添加反馈
          </button>
        </div>
      </div>
    </>
  );
};

export default SearchBar;
