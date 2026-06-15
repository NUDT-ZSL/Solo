import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext, Snippet } from './App';

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'HTML/CSS'];
const TAGS = ['算法', 'UI组件', '工具函数', '排序', '搜索', '性能', '数学', '布局'];

function getLangIcon(language: string): string {
  switch (language) {
    case 'JavaScript': return '⚡';
    case 'TypeScript': return 'TS';
    case 'Python': return '🐍';
    case 'HTML/CSS': return '#';
    default: return '</>';
  }
}

function getLangClass(language: string): string {
  return `lang-${language.toLowerCase().replace(/[\/]/g, '-')}`;
}

export default function SnippetList() {
  const {
    snippets,
    selectedSnippet,
    setSelectedSnippet,
    searchQuery,
    setSearchQuery,
    filterLanguage,
    setFilterLanguage,
    filterTag,
    setFilterTag,
    toggleFavorite,
    setShowEditor,
    setEditingSnippet,
  } = useAppContext();

  const [isFading, setIsFading] = useState(false);
  const prevFilterRef = useRef({ language: filterLanguage, tag: filterTag, query: searchQuery });

  useEffect(() => {
    const prev = prevFilterRef.current;
    if (prev.language !== filterLanguage || prev.tag !== filterTag || prev.query !== searchQuery) {
      setIsFading(true);
      const timer = setTimeout(() => setIsFading(false), 250);
      prevFilterRef.current = { language: filterLanguage, tag: filterTag, query: searchQuery };
      return () => clearTimeout(timer);
    }
  }, [filterLanguage, filterTag, searchQuery]);

  const [animatingFav, setAnimatingFav] = useState<string | null>(null);

  const handleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setAnimatingFav(id);
    toggleFavorite(id);
    setTimeout(() => setAnimatingFav(null), 200);
  };

  const handleEdit = (e: React.MouseEvent, snippet: Snippet) => {
    e.stopPropagation();
    setEditingSnippet(snippet);
    setShowEditor(true);
  };

  const filteredSnippets = useMemo(() => {
    return snippets;
  }, [snippets]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    snippets.forEach(s => {
      s.tags.split(',').forEach(t => {
        const trimmed = t.trim();
        if (trimmed) tagSet.add(trimmed);
      });
    });
    return Array.from(tagSet).sort();
  }, [snippets]);

  return (
    <div className="snippet-list">
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="搜索代码片段..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <span className="filter-label">语言：</span>
          <div className="pill-list">
            <button
              className={`pill ${filterLanguage === '' ? 'active' : ''}`}
              onClick={() => setFilterLanguage('')}
            >
              全部
            </button>
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                className={`pill ${filterLanguage === lang ? 'active' : ''}`}
                onClick={() => setFilterLanguage(filterLanguage === lang ? '' : lang)}
              >
                <span className={`lang-icon-small ${getLangClass(lang)}`}>
                  {getLangIcon(lang)}
                </span>
                {lang}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">标签：</span>
          <div className="pill-list">
            <button
              className={`pill ${filterTag === '' ? 'active' : ''}`}
              onClick={() => setFilterTag('')}
            >
              全部
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`pill ${filterTag === tag ? 'active' : ''}`}
                onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`snippet-cards ${isFading ? 'fading' : ''}`}>
        {filteredSnippets.length === 0 && (
          <div className="empty-list">暂无匹配的代码片段</div>
        )}
        {filteredSnippets.map(snippet => (
          <div
            key={snippet.id}
            className={`snippet-card ${selectedSnippet?.id === snippet.id ? 'selected' : ''}`}
            onClick={() => setSelectedSnippet(snippet)}
          >
            <div className="card-top">
              <span className={`lang-icon ${getLangClass(snippet.language)}`}>
                {getLangIcon(snippet.language)}
              </span>
              <div className="card-info">
                <div className="card-title">{snippet.title}</div>
                <div className="card-desc">{snippet.description}</div>
              </div>
              <div className="card-actions">
                <button
                  className={`btn-fav ${snippet.favorited ? 'favorited' : ''} ${animatingFav === snippet.id ? 'animating' : ''}`}
                  onClick={e => handleFavorite(e, snippet.id)}
                  title={snippet.favorited ? '取消收藏' : '收藏'}
                >
                  ★
                </button>
                <button
                  className="btn-edit-card"
                  onClick={e => handleEdit(e, snippet)}
                  title="编辑"
                >
                  ✎
                </button>
              </div>
            </div>
            <div className="card-preview">
              <code>{snippet.code.split('\n').slice(0, 3).join('\n')}</code>
            </div>
            <div className="card-tags">
              {snippet.tags.split(',').map((t, i) => (
                t.trim() && <span key={i} className="card-tag">{t.trim()}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
