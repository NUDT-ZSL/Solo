import React from 'react';
import type { Category } from '../types';
import { useData } from '../context/DataContext';

const ALL_CATEGORIES: Category[] = ['全部', '科幻', '文学', '历史'];

const CategoryFilter: React.FC = () => {
  const { selectedCategory, setSelectedCategory, categoryCounts } = useData();

  return (
    <aside className="category-filter">
      <div className="filter-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        书籍分类
      </div>
      <ul className="category-list">
        {ALL_CATEGORIES.map(cat => (
          <li key={cat}>
            <button
              className={`cat-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              <span className="cat-name">{cat}</span>
              <span className="cat-count">{categoryCounts[cat] ?? 0}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default CategoryFilter;
