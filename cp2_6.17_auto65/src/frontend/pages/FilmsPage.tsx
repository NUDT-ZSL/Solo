import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FilmWithStats } from '../../types.js';
import FilmCard from '../components/FilmCard.js';

const API_BASE = 'http://localhost:3001';
const PAGE_SIZE = 12;
const CATEGORIES = ['全部', '剧情', '纪录片', '动画'] as const;

type Category = typeof CATEGORIES[number];

const FilmsPage: React.FC = () => {
  const [films, setFilms] = useState<FilmWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('全部');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchFilms = useCallback(async (pageNum: number, currentCategory: Category, isNewFilter: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/films`);
      if (!response.ok) {
        throw new Error('获取影片数据失败');
      }

      const allFilms: FilmWithStats[] = await response.json();

      let filtered = allFilms;
      if (currentCategory !== '全部') {
        filtered = allFilms.filter(film => film.category === currentCategory);
      }

      const startIndex = 0;
      const endIndex = pageNum * PAGE_SIZE;
      const paginatedFilms = filtered.slice(startIndex, endIndex);

      setIsFiltering(true);
      setTimeout(() => {
        if (isNewFilter) {
          setFilms(paginatedFilms);
        } else {
          setFilms(prev => {
            const existingIds = new Set(prev.map(f => f.id));
            const newFilms = paginatedFilms.filter(f => !existingIds.has(f.id));
            return [...prev, ...newFilms];
          });
        }
        setHasMore(paginatedFilms.length === PAGE_SIZE && endIndex < filtered.length);
        setIsFiltering(false);
      }, 150);

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      setLoading(false);
      setIsFiltering(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchFilms(1, category, true);
  }, [category, fetchFilms]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFilms(nextPage, category, false);
  }, [loading, hasMore, page, category, fetchFilms]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  const handleCardClick = (id: string) => {
    navigate(`/film/${id}`);
  };

  const handleCategoryChange = (newCategory: Category) => {
    if (newCategory !== category) {
      setCategory(newCategory);
    }
  };

  return (
    <div className="films-page">
      <h1 className="page-title">影片列表</h1>

      <div className="filter-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`filter-tab ${category === cat ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button className="retry-btn" onClick={() => fetchFilms(page, category, false)}>
            重试
          </button>
        </div>
      )}

      <div className={`film-grid ${isFiltering ? 'filtering' : ''}`}>
        {films.map(film => (
          <FilmCard
            key={film.id}
            film={film}
            onClick={() => handleCardClick(film.id)}
          />
        ))}
      </div>

      {!loading && !error && films.length === 0 && (
        <div className="empty-state">
          暂无影片数据
        </div>
      )}

      <div ref={observerRef} className="load-more-trigger">
        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>加载中...</span>
          </div>
        )}
        {!loading && !hasMore && films.length > 0 && (
          <div className="no-more">没有更多了</div>
        )}
      </div>

      <style>{`
        .films-page {
          min-height: 100vh;
        }

        .error-message {
          background-color: #ffebee;
          color: #c62828;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .retry-btn {
          padding: 8px 16px;
          background-color: #ff6f00;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s ease;
        }

        .retry-btn:hover {
          background-color: #e65100;
        }

        .film-grid.filtering {
          opacity: 0.6;
          transform: scale(0.98);
        }

        .film-grid {
          opacity: 1;
          transform: scale(1);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .film-card {
          opacity: 1;
          transform: translateY(0);
          animation: fadeInUp 0.4s ease forwards;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .load-more-trigger {
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 24px;
        }

        .loading-spinner {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #8d6e63;
          font-size: 14px;
        }

        .no-more {
          color: #9e9e9e;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default FilmsPage;
