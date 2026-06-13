import { useState, useCallback } from 'react'

interface FilterBarProps {
  styleOptions: string[]
  selectedStyle: string
  selectedPriceRange: string
  searchKeyword: string
  onStyleChange: (style: string) => void
  onPriceRangeChange: (range: string) => void
  onSearchChange: (keyword: string) => void
}

const priceRanges = [
  { value: 'all', label: '全部' },
  { value: 'below50', label: '50以下' },
  { value: '50-200', label: '50-200' },
  { value: 'above200', label: '200以上' },
]

const FilterBar = ({
  styleOptions,
  selectedStyle,
  selectedPriceRange,
  searchKeyword,
  onStyleChange,
  onPriceRangeChange,
  onSearchChange,
}: FilterBarProps) => {
  const [localKeyword, setLocalKeyword] = useState(searchKeyword)

  const debounce = useCallback((func: (value: string) => void, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>
    return (value: string) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func(value), delay)
    }
  }, [])

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      onSearchChange(value)
    }, 300),
    [debounce, onSearchChange]
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalKeyword(value)
    debouncedSearch(value)
  }

  return (
    <div className="filter-bar">
      <div className="filter-section">
        <span className="filter-label">风格</span>
        <div className="filter-options">
          <button
            className={`filter-btn ${selectedStyle === '' ? 'active' : ''}`}
            onClick={() => onStyleChange('')}
          >
            全部
          </button>
          {styleOptions.map((style) => (
            <button
              key={style}
              className={`filter-btn ${selectedStyle === style ? 'active' : ''}`}
              onClick={() => onStyleChange(style)}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <span className="filter-label">价格</span>
        <div className="filter-options">
          {priceRanges.map((range) => (
            <button
              key={range.value}
              className={`filter-btn ${
                selectedPriceRange === range.value ? 'active' : ''
              }`}
              onClick={() => onPriceRangeChange(range.value)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section search-section">
        <div className="search-input-wrapper">
          <svg
            className="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="搜索作品..."
            value={localKeyword}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <style>{`
        .filter-bar {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 32px;
          padding: 24px;
          background: #2d2d44;
          border-radius: 12px;
        }

        .filter-section {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .filter-label {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #e0e0e0;
          min-width: 40px;
        }

        .filter-options {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 8px 16px;
          border: 1px solid rgba(201, 168, 76, 0.3);
          border-radius: 999px;
          background: transparent;
          color: #e0e0e0;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .filter-btn:hover {
          border-color: #c9a84c;
          color: #c9a84c;
        }

        .filter-btn.active {
          background: #c9a84c;
          border-color: #c9a84c;
          color: #1a1a2e;
          font-weight: 600;
        }

        .search-section {
          margin-left: auto;
        }

        .search-input-wrapper {
          position: relative;
          width: 280px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: #888;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px 10px 38px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: #1a1a2e;
          color: #e0e0e0;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease-in-out;
          box-sizing: border-box;
        }

        .search-input:focus {
          border-color: #c9a84c;
        }

        .search-input::placeholder {
          color: #666;
        }

        @media (max-width: 1024px) {
          .search-section {
            margin-left: 0;
          }

          .search-input-wrapper {
            width: 100%;
          }
        }

        @media (max-width: 768px) {
          .filter-bar {
            padding: 16px;
            gap: 16px;
          }

          .filter-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  )
}

export default FilterBar
