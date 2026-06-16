import React, { useState, useEffect, useMemo } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKey, setFilterKey] = useState(0);

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
  }, [selectedCategory, searchTerm, filterKey]);

  const handleCategoryChange = (category: MaterialCategory) => {
    setSelectedCategory(category);
    setFilterKey((prev) => prev + 1);
  };

  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSearchTerm(value);
        setFilterKey((prev) => prev + 1);
      }, 300);
    };
  }, []);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  return (
    <div className="gallery-page" key={filterKey}>
      <div className="gallery-header">
        <h1 className="gallery-title">发现匠心之作</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="搜索作品、作者或描述..."
            onChange={handleSearchInput}
            defaultValue={searchTerm}
          />
        </div>
        <div className="category-filters">
          {categories.map((cat) => (
            <button
              key={cat.value}
              className={`category-btn ${selectedCategory === cat.value ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.value)}
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
        <div className="gallery-grid">
          {works.map((work, index) => (
            <WorkCard key={`${work.id}-${filterKey}`} work={work} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
