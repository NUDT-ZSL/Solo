import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumCard from '../components/AlbumCard';
import { Podcast, podcastApi } from '../utils/api';
import './TagsPage.css';

const TagsPage: React.FC = () => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    searchPodcasts();
  }, [searchInput, startDate, endDate]);

  const searchPodcasts = async () => {
    try {
      setLoading(true);
      const data = await podcastApi.search(
        searchInput.trim(),
        startDate || undefined,
        endDate || undefined
      );
      setPodcasts(data);
    } catch (err) {
      console.error('Failed to search podcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickTags = ['科技', '健康', '教育', '娱乐', '商业', '生活'];

  const handleQuickTagClick = (tag: string) => {
    if (searchInput.includes(tag)) {
      const newInput = searchInput
        .split(/\s+/)
        .filter(t => t !== tag)
        .join(' ');
      setSearchInput(newInput);
    } else {
      const newInput = searchInput ? `${searchInput} ${tag}` : tag;
      setSearchInput(newInput);
    }
  };

  return (
    <div className="tags-page">
      <header className="app-header">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1>PodcastVault</h1>
        </div>
        <nav className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/')}>首页</button>
          <button className="nav-btn active" onClick={() => navigate('/tags')}>标签搜索</button>
          <button className="nav-btn upload-btn" onClick={() => navigate('/upload')}>上传</button>
        </nav>
      </header>

      <main className="main-content">
        <section className="search-section">
          <h2>标签搜索</h2>
          <p className="search-desc">输入标签关键词，多个标签用空格分隔</p>

          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="输入标签搜索..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button 
                className="clear-btn"
                onClick={() => setSearchInput('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="quick-tags">
            <span className="quick-tags-label">快速选择：</span>
            {quickTags.map(tag => (
              <button
                key={tag}
                className={`quick-tag ${searchInput.split(/\s+/).includes(tag) ? 'active' : ''}`}
                onClick={() => handleQuickTagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="date-range">
            <div className="date-input-group">
              <label>开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="date-separator">至</div>
            <div className="date-input-group">
              <label>结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(startDate || endDate) && (
              <button 
                className="clear-date-btn"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                清除日期
              </button>
            )}
          </div>
        </section>

        <section className="results-section">
          <div className="results-header">
            <h3>搜索结果</h3>
            <span className="results-count">
              {loading ? '搜索中...' : `共 ${podcasts.length} 个结果`}
            </span>
          </div>

          {loading ? (
            <div className="loading-grid">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="skeleton-card-small"></div>
              ))}
            </div>
          ) : podcasts.length > 0 ? (
            <div className="podcasts-grid">
              {podcasts.map(podcast => (
                <AlbumCard key={podcast._id} podcast={podcast} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="empty-text">没有找到匹配的专辑，换个标签试试？</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TagsPage;
