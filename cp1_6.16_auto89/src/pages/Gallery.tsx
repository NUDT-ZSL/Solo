import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Work, MaterialCategory } from '../types';
import { getWorkList } from '../utils/mockApi';
import WorkCard from '../components/WorkCard';
import '../styles/Gallery.css';

const categories: { value: MaterialCategory; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'ceramic', label: '陶瓷' },
  { value: 'wood', label: '木工' },
  { value: 'embroidery', label: '刺绣' },
  { value: 'metal', label: '金属' },
];

const Gallery: React.FC = () => {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKey, setFilterKey] = useState(0);
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const updateColumnCount = () => {
      if (window.innerWidth <= 768) {
        setColumnCount(2);
      } else if (window.innerWidth <= 1024) {
        setColumnCount(3);
      } else {
        setColumnCount(3);
      }
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  useEffect(() => {
    const fetchWorks = async () => {
      setLoading(true);
      try {
        const data = await getWorkList(selectedCategory, searchTerm);
        setWorks(data);
      } catch (error) {
        console.error('Failed to fetch works:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorks();
  }, [selectedCategory, searchTerm]);

  const debouncedSearch = useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSearchTerm(value);
        setFilterKey((prev) => prev + 1);
      }, 300);
    };
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleCategoryClick = useCallback((category: MaterialCategory) => {
    setSelectedCategory(category);
    setFilterKey((prev) => prev + 1);
  }, []);

  const getAnimationDelay = (index: number): number => {
    const rowIndex = Math.floor(index / columnCount);
    const colIndex = index % columnCount;
    return rowIndex * 0.08 + colIndex * 0.06;
  };

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <h1 className="gallery-title">发现匠心之作</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="搜索作品、作者或描述..."
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>
        <div className="category-filters">
          {categories.map((cat) => (
            <button
              key={cat.value}
              className={`category-btn ${selectedCategory === cat.value ? 'active' : ''}`}
              onClick={() => handleCategoryClick(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : works.length === 0 ? (
        <div className="no-results">没有找到相关作品</div>
      ) : (
        <div className="gallery-masonry" key={filterKey}>
          {works.map((work, index) => (
            <div key={`${work.id}-${filterKey}`} className="masonry-item">
              <WorkCard work={work} delay={getAnimationDelay(index)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
