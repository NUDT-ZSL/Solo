import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../hooks/useData';
import { useStore } from '../store/useStore';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [focused, setFocused] = useState(false);
  const { results, loading, search } = useSearch();
  const { searchHistory, addSearchHistory, clearSearchHistory } = useStore();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      search(v);
      setShowDropdown(v.length > 0);
    }, 100);
  };

  const handleSelect = (result: { id: string; name: string; type: string }) => {
    addSearchHistory(query);
    setQuery('');
    setShowDropdown(false);
    navigate(`/artist/${result.id}`);
  };

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    search(term);
    setShowDropdown(true);
    setFocused(true);
  };

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      <input
        className="search-input"
        type="text"
        placeholder="搜索音乐人、歌曲或风格..."
        value={query}
        onChange={handleChange}
        onFocus={() => {
          setFocused(true);
          if (query) setShowDropdown(true);
        }}
      />
      {showDropdown && (
        <div className="search-dropdown">
          {loading && <div className="search-item"><span>搜索中...</span></div>}
          {!loading && results.length === 0 && (
            <div className="search-item"><span>没有找到匹配结果</span></div>
          )}
          {results.map((r, i) => (
            <div key={i} className="search-item" onClick={() => handleSelect(r)}>
              <span>{r.name}{r.extra ? ` · ${r.extra}` : ''}</span>
              <span className="search-item-type">{r.type === 'artist' ? '音乐人' : '歌曲'}</span>
            </div>
          ))}
        </div>
      )}
      {!focused || (!showDropdown && searchHistory.length > 0 && !query) ? null : null}
      {focused && searchHistory.length > 0 && !showDropdown && (
        <div className="search-history">
          {searchHistory.map((h, i) => (
            <span key={i} className="history-tag" onClick={() => handleHistoryClick(h)}>
              {h}
            </span>
          ))}
          <span className="history-tag" onClick={clearSearchHistory} style={{ color: '#ef4444' }}>
            清除历史
          </span>
        </div>
      )}
      {searchHistory.length > 0 && !query && (
        <div className="search-history">
          {searchHistory.map((h, i) => (
            <span key={i} className="history-tag" onClick={() => handleHistoryClick(h)}>
              {h}
            </span>
          ))}
          <span className="history-tag" onClick={clearSearchHistory} style={{ color: '#ef4444' }}>
            清除历史
          </span>
        </div>
      )}
    </div>
  );
}
