import { useState, useCallback } from 'react';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { ALL_EMOTION_TAGS, EMOTION_LABELS, EMOTION_COLORS } from '../../shared/types';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterTag: string;
  onFilterTagChange: (tag: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  isMobile: boolean;
  onToggleMobileFilter: () => void;
}

export default function SearchBar({
  searchQuery,
  onSearchChange,
  filterTag,
  onFilterTagChange,
  sortBy,
  onSortChange,
  isMobile,
  onToggleMobileFilter,
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  if (isMobile) {
    return (
      <>
        <div className="absolute top-3 left-3 right-14 z-30">
          <div className="flex items-center bg-earth-cream/95 backdrop-blur-sm rounded-full shadow-map px-3 py-2">
            <Search size={16} className="text-earth-brown/50 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索声景..."
              className="flex-1 ml-2 text-sm bg-transparent text-earth-brown placeholder:text-earth-brown/40 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className="text-earth-brown/50">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <button
          onClick={onToggleMobileFilter}
          className="absolute top-3 right-3 z-30 p-2.5 bg-earth-cream/95 backdrop-blur-sm rounded-full shadow-map text-earth-brown hover:bg-earth-wheat transition-colors"
        >
          <SlidersHorizontal size={18} />
        </button>
      </>
    );
  }

  return (
    <div className="absolute top-3 left-3 right-3 z-30">
      <div className="flex items-center gap-2 bg-earth-cream/95 backdrop-blur-sm rounded-map shadow-map px-4 py-3">
        <Search size={18} className="text-earth-brown/50 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索位置名称或标记标题..."
          className="flex-1 text-sm bg-transparent text-earth-brown placeholder:text-earth-brown/40 focus:outline-none"
        />
        {searchQuery && (
          <button onClick={() => onSearchChange('')} className="text-earth-brown/50">
            <X size={14} />
          </button>
        )}
        <div className="h-5 w-px bg-earth-brown/10" />
        <button
          onClick={toggleFilters}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors duration-300 ${
            showFilters || filterTag || sortBy !== 'distance'
              ? 'bg-earth-wheat text-earth-brown'
              : 'text-earth-brown/60 hover:bg-earth-warm/50'
          }`}
        >
          <Filter size={14} />
          筛选
        </button>
      </div>

      {showFilters && (
        <div className="mt-2 bg-earth-cream/95 backdrop-blur-sm rounded-map shadow-map px-4 py-3 space-y-3 animate-slide-down">
          <div>
            <div className="text-xs font-medium text-earth-brown/60 mb-1.5">
              情绪标签
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onFilterTagChange('')}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  filterTag === ''
                    ? 'bg-earth-brown text-white'
                    : 'bg-earth-warm/60 text-earth-brown hover:bg-earth-warm'
                }`}
              >
                全部
              </button>
              {ALL_EMOTION_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onFilterTagChange(tag)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                    filterTag === tag
                      ? 'bg-earth-brown text-white'
                      : 'bg-earth-warm/60 text-earth-brown hover:bg-earth-warm'
                  }`}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: EMOTION_COLORS[tag] }}
                  />
                  {EMOTION_LABELS[tag]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-earth-brown/60 mb-1.5">
              排序方式
            </div>
            <div className="flex gap-2">
              {[
                { key: 'distance', label: '距离最近' },
                { key: 'newest', label: '最新创建' },
                { key: 'popular', label: '最多点赞' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => onSortChange(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    sortBy === opt.key
                      ? 'bg-earth-wheat text-earth-brown'
                      : 'bg-earth-warm/40 text-earth-brown/60 hover:bg-earth-warm/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
