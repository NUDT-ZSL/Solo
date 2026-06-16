import { useState, useCallback, useRef, useEffect } from 'react';
import { searchRegions, Region } from '@/data/cuisineData';

interface SearchBarProps {
  onSelectRegion: (region: Region) => void;
}

export default function SearchBar({ onSelectRegion }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Region[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.trim()) {
      const found = searchRegions(value);
      setResults(found);
      setShowDropdown(true);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, []);

  const handleSelectRegion = useCallback((region: Region) => {
    setQuery(region.name);
    setShowDropdown(false);
    onSelectRegion(region);
  }, [onSelectRegion]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelectRegion(results[0]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }, [results, handleSelectRegion]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="搜索食物名或国家名..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setShowDropdown(true)}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowDropdown(false);
              inputRef.current?.focus();
            }}
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div ref={dropdownRef} className="search-dropdown">
          {results.map((region) => (
            <div
              key={region.id}
              className="search-result-item"
              onClick={() => handleSelectRegion(region)}
            >
              <span
                className="search-result-dot"
                style={{ backgroundColor: region.color }}
              ></span>
              <div className="search-result-info">
                <span className="search-result-name">{region.name}</span>
                <span className="search-result-en">{region.nameEn}</span>
              </div>
              <span className="search-result-dishes">
                {region.dishes.length} 道菜品
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
