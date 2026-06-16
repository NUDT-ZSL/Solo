import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useItems } from '../hooks/useItems';
import LazyImage from '../components/LazyImage';
import type { Item } from '../types';

const CATEGORIES = [
  { value: 'all', label: '全部分类' },
  { value: '家居', label: '🏠 家居' },
  { value: '数码', label: '💻 数码' },
  { value: '书籍', label: '📚 书籍' },
  { value: '衣物', label: '👔 衣物' },
  { value: '其他', label: '🎁 其他' },
];

const SEARCH_MODES = [
  { value: 'all', label: '全部' },
  { value: 'name', label: '名称' },
  { value: 'desc', label: '描述' },
] as const;

type SearchMode = 'all' | 'name' | 'desc';

const CATEGORY_BG_CLASS: Record<string, string> = {
  '家居': 'cat-home',
  '数码': 'cat-digital',
  '书籍': 'cat-book',
  '衣物': 'cat-clothing',
  '其他': 'cat-other',
};

function SkeletonGrid() {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-image" />
          <div className="skeleton-body">
            <div className="skeleton-line medium" />
            <div className="skeleton-line full" />
            <div className="skeleton-line short" />
            <div className="skeleton-line full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilter, onReset }: { hasFilter: boolean; onReset: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">🔍</div>
      <div className="empty-state-title">
        {hasFilter ? '没有找到匹配的物品' : '暂无闲置物品'}
      </div>
      <div className="empty-state-desc">
        {hasFilter
          ? '试试调整搜索关键词或筛选条件'
          : '社区里暂时还没有人发布闲置物品'}
      </div>
      {hasFilter && (
        <button className="empty-state-action" onClick={onReset}>
          重置筛选条件
        </button>
      )}
    </div>
  );
}

export default function ItemListPage() {
  const navigate = useNavigate();
  const { items, loading, error, total, hasMore, fetchItems, loadMore } = useItems();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [searchDebounced, setSearchDebounced] = useState('');

  const hasFilter = category !== 'all' || search.trim().length > 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchItems(category, searchDebounced, 1, true);
  }, [category, searchDebounced, fetchItems]);

  const handleCardClick = useCallback(
    (item: Item) => {
      navigate(`/items/${item.id}`);
    },
    [navigate]
  );

  const handleLoadMore = () => {
    loadMore(category, searchDebounced);
  };

  const handleReset = () => {
    setSearch('');
    setCategory('all');
    setSearchMode('all');
  };

  const filteredItems = useMemo(() => {
    if (!searchDebounced.trim()) return items;
    const keyword = searchDebounced.toLowerCase();
    return items.filter((item) => {
      if (searchMode === 'name') return item.name.toLowerCase().includes(keyword);
      if (searchMode === 'desc') return item.description.toLowerCase().includes(keyword);
      return item.name.toLowerCase().includes(keyword) || item.description.toLowerCase().includes(keyword);
    });
  }, [items, searchDebounced, searchMode]);

  const searchPlaceholder = useMemo(() => {
    if (searchMode === 'name') return '按物品名称搜索...';
    if (searchMode === 'desc') return '按物品描述搜索...';
    return '搜索物品名称或描述...';
  }, [searchMode]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">社区闲置广场</h1>
        <p className="page-subtitle">发现邻里好物，用积分开启循环生活</p>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="search-mode-toggle">
          {SEARCH_MODES.map((mode) => (
            <button
              key={mode.value}
              className={`search-mode-btn ${searchMode === mode.value ? 'active' : ''}`}
              onClick={() => setSearchMode(mode.value)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <select
          className="category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {hasFilter && (
          <button className="reset-filter-btn" onClick={handleReset}>
            重置筛选
          </button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <SkeletonGrid />
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-title">加载失败</div>
          <div className="empty-state-desc">{error}</div>
          <button className="empty-state-action" onClick={() => fetchItems(category, searchDebounced, 1, true)}>
            重新加载
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState hasFilter={hasFilter} onReset={handleReset} />
      ) : (
        <>
          <div className="items-grid">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="item-card"
                onClick={() => handleCardClick(item)}
              >
                <div className="item-card-image-wrapper">
                  <div className={`item-card-image-bg ${CATEGORY_BG_CLASS[item.category] || 'cat-other'}`} />
                  <LazyImage src={item.image} alt={item.name} />
                </div>
                <div className="item-card-body">
                  <div className="item-card-name">{item.name}</div>
                  <div className="item-card-desc">{item.description}</div>
                  <div className="item-card-footer">
                    <span className="item-card-points">{item.points} 积分</span>
                    <span className="item-card-owner">@{item.ownerName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length < total && (
            <div className="load-more-container">
              {loading ? (
                <div className="loading-text">加载更多中...</div>
              ) : (
                <button className="load-more-btn" onClick={handleLoadMore}>
                  加载更多
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
