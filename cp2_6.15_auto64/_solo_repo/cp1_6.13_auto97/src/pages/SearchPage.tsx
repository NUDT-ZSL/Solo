import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import WordCloud from '../components/WordCloud';

interface Entry {
  id: string;
  mood: number;
  note: string;
  date: string;
  createdAt: string;
}

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const res = await axios.get('/api/entries/all');
      setAllEntries(res.data);
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = query.trim()
    ? allEntries.filter(
        (e) =>
          e.note.toLowerCase().includes(query.toLowerCase()) ||
          e.date.includes(query)
      )
    : [];

  const allNotes = allEntries.map((e) => e.note).filter((n) => n.trim());

  const getMoodEmoji = (mood: number) => {
    if (mood <= 2) return '😢';
    if (mood <= 4) return '😕';
    if (mood <= 6) return '😐';
    if (mood <= 8) return '🙂';
    return '😊';
  };

  const getMoodColor = (mood: number) => {
    if (mood <= 3) return '#ef4444';
    if (mood <= 6) return '#eab308';
    return '#22c55e';
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 className="page-section-title">搜索与筛选</h2>

      <div className="search-box-wrapper">
        <svg
          className="search-box-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入关键词搜索笔记和日期..."
          className="search-input"
        />
      </div>

      <div className="page-section-title" style={{ marginTop: 32 }}>词语云</div>
      <div className="wordcloud-section">
        <WordCloud notes={allNotes} />
      </div>

      {query.trim() && (
        <div style={{ marginTop: 24 }}>
          <h3 className="page-section-title">
            搜索结果 ({filtered.length})
          </h3>
          {filtered.length === 0 ? (
            <div className="search-empty">未找到匹配的记录</div>
          ) : (
            <div className="search-results">
              {filtered.map((entry) => (
                <div key={entry.id} className="search-result-card">
                  <div className="search-result-header">
                    <span
                      className="search-result-mood-badge"
                      style={{ backgroundColor: getMoodColor(entry.mood) }}
                    >
                      {getMoodEmoji(entry.mood)} {entry.mood}
                    </span>
                    <span className="search-result-date">{entry.date}</span>
                  </div>
                  {entry.note && (
                    <div className="search-result-note">
                      {entry.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="loading-state">加载中...</div>
      )}
    </div>
  );
};

export default SearchPage;
