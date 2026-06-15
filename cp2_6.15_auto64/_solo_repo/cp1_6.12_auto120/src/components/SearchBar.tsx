import React, { useState, memo } from 'react';

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

const SearchBarComponent: React.FC<SearchBarProps> = ({
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
              className={`