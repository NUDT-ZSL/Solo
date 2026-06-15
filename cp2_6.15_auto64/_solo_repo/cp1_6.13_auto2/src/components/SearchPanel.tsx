import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Room, City } from '../types';
import { searchCities, addCity, removeCity, startVoting } from '../utils/roomManager';
import '../styles/SearchPanel.css';

interface SearchPanelProps {
  room: Room;
  userId: string;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ room }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(true);
  const [sidebarMinimized, setSidebarMinimized] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    handleSearch('');
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const results = await searchCities(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, handleSearch]);

  const handleAddCity = useCallback((city: City) => {
    addCity(city.id);
  }, []);

  const handleRemoveCity = useCallback((cityId: string) => {
    removeCity(cityId);
  }, []);

  const isCitySelected = useCallback(
    (cityId: string) => {
      return room.selectedCities.some((c) => c.id === cityId);
    },
    [room.selectedCities]
  );

  const handleStartVoting = useCallback(() => {
    if (room.selectedCities.length > 0) {
      startVoting();
    }
  }, [room.selectedCities.length]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const scrollToResults = () => {
    if (resultsRef.current && searchResults.length > 0) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="search-panel">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">发现你的下一次冒险</h1>
          <p className="hero-subtitle">和朋友们一起收集灵感，投票决定目的地</p>
          <div className="search-container">
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
                placeholder="搜索城市，比如：巴黎、东京、纽约..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') scrollToResults();
                }}
              />
              {isSearching && <div className="search-spinner"></div>}
            </div>
          </div>
          <div className="hero-tags">
            <span className="tag">热门目的地</span>
            <span className="tag">浪漫之城</span>
            <span className="tag">美食天堂</span>
            <span className="tag">自然风光</span>
          </div>
        </div>
      </section>

      <section className="results-section" ref={resultsRef}>
        <div className="results-header">
          <h2>{searchQuery.trim() ? '搜索结果' : '✨ 热门推荐'}</h2>
          <span className="results-count">
            {searchResults.length > 0 ? `找到 ${searchResults.length} 个城市` : ''}
          </span>
        </div>

        {isSearching ? (
          <div className="empty-state">
            <div className="search-spinner-large"></div>
            <p>加载中...</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="empty-state">
            <p>没有找到相关城市，试试其他关键词吧</p>
          </div>
        ) : (
          <div className="city-grid">
            {searchResults.map((city) => (
              <div
                key={city.id}
                className={`city-card ${isCitySelected(city.id) ? 'selected' : ''}`}
                onClick={() => handleAddCity(city)}
              >
                <div className="city-image">
                  <img src={city.image} alt={city.name} />
                  {isCitySelected(city.id) && (
                    <div className="city-selected-overlay">
                      <span className="selected-check">✓ 已添加</span>
                    </div>
                  )}
                </div>
                <div className="city-info">
                  <h3 className="city-name">{city.name}</h3>
                  <p className="city-name-en">{city.nameEn}</p>
                  <p className="city-description">{city.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div
        className={`sidebar ${sidebarMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
      >
        <div
          className="sidebar-handle"
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div className="handle-grid" title="拖拽移动，点击收起">
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
          </div>
          {!sidebarMinimized && (
            <button
              className="minimize-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarMinimized(true);
              }}
              title="最小化侧边栏"
            >
              —
            </button>
          )}
        </div>

        {sidebarMinimized && (
          <div
            className="sidebar-minimized-content"
            onClick={() => setSidebarMinimized(false)}
            title="展开侧边栏"
          >
            <span className="minimized-count">{room.selectedCities.length}</span>
            <span className="minimized-label">已选</span>
          </div>
        )}

        {!sidebarMinimized && (
          <>
            <div className="sidebar-header">
              <h3>已选城市</h3>
              <span className="sidebar-count">{room.selectedCities.length}</span>
            </div>

            <div className="sidebar-list">
              {room.selectedCities.length === 0 ? (
                <div className="sidebar-empty">
                  <p>点击卡片添加城市</p>
                </div>
              ) : (
                room.selectedCities.map((city, index) => (
                  <div key={city.id} className="sidebar-item">
                    <span className="item-index">{index + 1}</span>
                    <div className="item-thumb">
                      <img src={city.image} alt={city.name} />
                    </div>
                    <div className="item-info">
                      <span className="item-name">{city.name}</span>
                      <span className="item-desc">{city.description}</span>
                    </div>
                    <button
                      className="item-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCity(city.id);
                      }}
                      title="删除"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="sidebar-footer">
              <button
                className="start-vote-btn"
                onClick={handleStartVoting}
                disabled={room.selectedCities.length === 0}
              >
                发起投票
              </button>
            </div>
          </>
        )}
      </div>

      <button
        className="mobile-fab"
        onClick={() => setSidebarOpenMobile(true)}
      >
        <span>📍</span>
        <span className="fab-count">{room.selectedCities.length}</span>
      </button>

      {sidebarOpenMobile && (
        <div className="mobile-drawer-overlay" onClick={() => setSidebarOpenMobile(false)}>
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-handle">
              <div className="drawer-handle-bar"></div>
            </div>
            <div className="sidebar-header">
              <h3>已选城市</h3>
              <span className="sidebar-count">{room.selectedCities.length}</span>
              <button
                className="drawer-close"
                onClick={() => setSidebarOpenMobile(false)}
              >
                ×
              </button>
            </div>
            <div className="sidebar-list">
              {room.selectedCities.length === 0 ? (
                <div className="sidebar-empty">
                  <p>点击卡片添加城市</p>
                </div>
              ) : (
                room.selectedCities.map((city, index) => (
                  <div key={city.id} className="sidebar-item">
                    <span className="item-index">{index + 1}</span>
                    <div className="item-thumb">
                      <img src={city.image} alt={city.name} />
                    </div>
                    <div className="item-info">
                      <span className="item-name">{city.name}</span>
                      <span className="item-desc">{city.description}</span>
                    </div>
                    <button
                      className="item-delete"
                      onClick={() => handleRemoveCity(city.id)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="sidebar-footer">
              <button
                className="start-vote-btn"
                onClick={() => {
                  handleStartVoting();
                  setSidebarOpenMobile(false);
                }}
                disabled={room.selectedCities.length === 0}
              >
                发起投票
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPanel;
