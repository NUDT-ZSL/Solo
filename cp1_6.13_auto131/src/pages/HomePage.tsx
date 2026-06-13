import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { Snippet, LANGUAGES } from '../types';
import { getSnippets } from '../api/snippets';
import SnippetList from '../components/SnippetList';

const homePageStyles = `
  .home-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .home-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .home-title {
    font-size: 28px;
    font-weight: 700;
    color: #e2e8f0;
    letter-spacing: -0.5px;
  }

  .home-subtitle {
    font-size: 14px;
    color: #94a3b8;
    margin-top: 4px;
  }

  .filter-bar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    padding: 16px;
    background: #1e293b;
    border-radius: 12px;
    border: 1px solid #334155;
  }

  .filter-bar-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #94a3b8;
    font-weight: 500;
  }

  .filter-input {
    padding: 8px 14px;
    border-radius: 8px;
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #334155;
    font-size: 13px;
    transition: border-color 0.15s ease;
    min-width: 160px;
  }

  .filter-input:focus {
    border-color: #6366f1;
  }

  .filter-input::placeholder {
    color: #475569;
  }

  .filter-select {
    padding: 8px 32px 8px 14px;
    border-radius: 8px;
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #334155;
    font-size: 13px;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .filter-select:focus {
    border-color: #6366f1;
  }

  .filter-select option {
    background: #0f172a;
    color: #e2e8f0;
  }

  .search-wrapper {
    position: relative;
    flex: 1;
    min-width: 200px;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #475569;
    pointer-events: none;
  }

  .search-wrapper .filter-input {
    width: 100%;
    padding-left: 36px;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    gap: 12px;
    color: #94a3b8;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #334155;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 480px) {
    .filter-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .search-wrapper {
      min-width: unset;
    }

    .filter-input,
    .filter-select {
      min-width: unset;
      width: 100%;
    }

    .home-title {
      font-size: 22px;
    }
  }
`;

export default function HomePage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [languageFilter, setLanguageFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');

  const fetchSnippets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSnippets({
        lang: languageFilter || undefined,
        tags: tagFilter || undefined,
        keyword: keywordFilter || undefined,
        sortBy: 'createdAt',
        order: 'desc',
      });
      setSnippets(data);
    } catch (err) {
      console.error('Failed to fetch snippets:', err);
    } finally {
      setLoading(false);
    }
  }, [languageFilter, tagFilter, keywordFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSnippets();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchSnippets]);

  return (
    <>
      <style>{homePageStyles}</style>
      <div className="home-page">
        <div className="home-header">
          <div>
            <h1 className="home-title">代码片段库</h1>
            <p className="home-subtitle">
              共 {snippets.length} 个代码片段
            </p>
          </div>
        </div>

        <div className="filter-bar">
          <span className="filter-bar-label">
            <Filter size={14} />
            筛选
          </span>

          <select
            className="filter-select"
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
          >
            <option value="">全部语言</option>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>

          <input
            className="filter-input"
            type="text"
            placeholder="按标签筛选..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          />

          <div className="search-wrapper">
            <Search className="search-icon" size={16} />
            <input
              className="filter-input"
              type="text"
              placeholder="搜索标题或代码内容..."
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            加载中...
          </div>
        ) : (
          <SnippetList snippets={snippets} onFavoriteToggle={fetchSnippets} />
        )}
      </div>
    </>
  );
}
