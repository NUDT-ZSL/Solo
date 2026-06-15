import { PledgeCategory, CATEGORY_COLORS, CATEGORY_LABELS } from './dataStore'

export type SortOption = 'newest' | 'oldest' | 'progress-high' | 'progress-low'

interface SearchFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: PledgeCategory | null
  onCategoryChange: (category: PledgeCategory | null) => void
  sortOption: SortOption
  onSortChange: (option: SortOption) => void
}

const CATEGORIES: PledgeCategory[] = ['plastic', 'transport', 'local', 'animal']

export default function SearchFilter({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortOption,
  onSortChange
}: SearchFilterProps) {
  return (
    <div className="search-filter-container">
      <div className="search-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="搜索目的地或用户名..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-row">
        <div className="category-filter-group">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
              style={selectedCategory === cat ? { background: CATEGORY_COLORS[cat] } : undefined}
              onClick={() => onCategoryChange(selectedCategory === cat ? null : cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <select
          className="sort-select"
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
        >
          <option value="newest">最新发布</option>
          <option value="oldest">最早发布</option>
          <option value="progress-high">完成度最高</option>
          <option value="progress-low">完成度最低</option>
        </select>
      </div>
    </div>
  )
}
