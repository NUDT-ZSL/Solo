import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useStore } from '../store/useStore';
import type { Artist, SearchResult } from '../types';

interface LocalSearchResult extends SearchResult {
  score: number;
  matchType: 'name' | 'genre' | 'song';
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<LocalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const { searchHistory, addSearchHistory, clearSearchHistory } = useStore();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>();

  useEffect(() => {
    api.getArtists().then(a => setArtists(a as unknown as Artist[])).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const matchedGenres = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const genreSet = new Set<string>();
    artists.forEach(a => a.genre.forEach(g => {
      if (g.toLowerCase().includes(q)) genreSet.add(g);
    }));
    return Array.from(genreSet).slice(0, 6);
  }, [query, artists]);

  const handleSearch = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.search(q);
      const qLower = q.toLowerCase();
      const scored: LocalSearchResult[] = data.map(r => {
        let score = 0;
        let matchType: LocalSearchResult['matchType'] = 'genre';
        if (r.type === 'artist') {
          if (r.name.toLowerCase().includes(qLower)) {
            score = r.name.toLowerCase().startsWith(qLower) ? 100 : 80;
            matchType = 'name';
          } else {
            score = 50;
            matchType = 'genre';
          }
        } else {
          score = r.name.toLowerCase().includes(qLower) ? 30 : 20;
          matchType = 'song';
        }
        return { ...r, score, matchType };
      });
      scored.sort((a, b) => b.score - a.score);
      setResults(scored);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      handleSearch(v);
      setShowDropdown(v.length > 0);
    }, 100);
  };

  const handleSelect = (result: { id: string; name: string }) => {
    addSearchHistory(query);
    setQuery('');
    setShowDropdown(false);
    navigate(`/artist/${result.id}`);
  };

  const handleGenreClick = (genre: string) => {
    setQuery(genre);
    handleSearch(genre);
    setShowDropdown(true);
  };

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    handleSearch(term);
    setShowDropdown(true);
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
          if (query) setShowDropdown(true);
        }}
      />
      {showDropdown && (
        <div className="search-dropdown">
          {matchedGenres.length > 0 && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                🏷️ 匹配的风格标签
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {matchedGenres.map(g => (
                  <span
                    key={g}
                    className="genre-tag"
                    onClick={() => handleGenreClick(g)}
                    style={{ cursor: 'pointer', padding: '4px 12px' }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
          {loading && <div className="search-item"><span>搜索中...</span></div>}
          {!loading && results.length === 0 && matchedGenres.length === 0 && (
            <div className="search-item"><span>没有找到匹配结果</span></div>
          )}
          {results.map((r, i) => (
            <div key={i} className="search-item" onClick={() => handleSelect(r)}>
              <span>{r.name}{r.extra ? ` · ${r.extra}` : ''}</span>
              <span className="search-item-type" style={{
                background: r.matchType === 'name'
                  ? 'rgba(139,92,246,0.2)'
                  : r.matchType === 'genre'
                    ? 'rgba(6,182,212,0.15)'
                    : 'rgba(234,179,8,0.15)',
                color: r.matchType === 'name'
                  ? '#a78bfa'
                  : r.matchType === 'genre'
                    ? '#06b6d4'
                    : '#eab308'
              }}>
                {r.matchType === 'name' ? '音乐人' : r.matchType === 'genre' ? '标签匹配' : '歌曲'}
              </span>
            </div>
          ))}
        </div>
      )}
      {searchHistory.length > 0 && !query && !showDropdown && (
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
