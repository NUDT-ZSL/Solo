import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FilmWithStats } from '../../types.js';
import FilmCard from '../components/FilmCard.js';

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
  const observerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const loadingRef = useRef(false);

  const fetchFilms = useCallback(async (pageNum: number, currentCategory: Category) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/films');
      if (!response.ok) {
        throw new Error('获取影片数据失败');
      }

      const allFilms: FilmWithStats[] = await response.json();

      let filtered = allFilms;
      if (currentCategory !== '全部') {
        filtered = allFilms.filter(film => film.category === currentCategory);
      }

      const endIndex = pageNum * PAGE_SIZE;
      const paginatedFilms = filtered.slice(0, endIndex);

      setFilms(paginatedFilms);
      setHasMore(endIndex < filtered.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchFilms(1, category);
  }, [category, fetchFilms]);

  useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          setPage(prev => {
            const nextPage = prev + 1;
            fetchFilms(nextPage, category);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, category, fetchFilms]);

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
          <button className="retry-btn" onClick={() => fetchFilms(page, category)}>
            重试
          </button>
        </div>
      )}

      <div className="film-grid">
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
            <div className="spinner" style={{ borderTopColor: 'transparent', borderColor: '#8d6e63' }}></div>
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

        .film-grid {
          opacity: 1;
          transform: scale(1);
          transition: opacity 0.3s ease, transform 0.3s ease;
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
