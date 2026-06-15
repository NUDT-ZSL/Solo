import { useState, useMemo, useEffect } from 'react';
import type { Inspiration, InspirationType, Priority } from '../types/inspiration';
import { TYPE_LABELS, TYPE_COLORS, PRIORITY_COLORS } from '../types/inspiration';
import { InspirationEngine, type SortType } from '../business/InspirationEngine';

interface Props {
  inspirations: Inspiration[];
  onToggleFavorite: (id: string) => void;
}

function InspirationBoard({ inspirations, onToggleFavorite }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<InspirationType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortType, setSortType] = useState<SortType>('newest');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Inspiration | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const projects = useMemo(() => {
    const engine = new InspirationEngine(inspirations);
    return engine.getProjects();
  }, [inspirations]);

  const filteredInspirations = useMemo(() => {
    const engine = new InspirationEngine(inspirations);
    return engine
      .filter({
        search: debouncedSearch,
        type: typeFilter,
        priority: priorityFilter,
        project: projectFilter,
        onlyFavorites,
      })
      .sort(sortType)
      .getResults();
  }, [inspirations, debouncedSearch, typeFilter, priorityFilter, projectFilter, sortType, onlyFavorites]);

  const hasAnyFilter = debouncedSearch || typeFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all' || onlyFavorites;

  return (
    <div className="board-page">
      <div className="filter-bar">
        <div className="filter-header">
          <button
            className="filter-toggle-btn"
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
          >
            {filterPanelOpen ? '收起筛选' : '展开筛选'}
            <span className={`arrow ${filterPanelOpen ? 'up' : 'down'}`}>▼</span>
          </button>
          {hasAnyFilter && (
            <span className="filter-count-badge">
              已筛选 {filteredInspirations.length} 条
            </span>
          )}
        </div>

        <div className={`filter-panel ${filterPanelOpen ? 'open' : ''}`}>
          <div className="filter-row">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="搜索标题或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>类型</label>
              <select
                className="filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as InspirationType | 'all')}
              >
                <option value="all">全部类型</option>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>优先级</label>
              <select
                className="filter-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
              >
                <option value="all">全部优先级</option>
                <option value="P1">P1 - 最高</option>
                <option value="P2">P2 - 较高</option>
                <option value="P3">P3 - 中等</option>
                <option value="P4">P4 - 较低</option>
              </select>
            </div>

            <div className="filter-group">
              <label>项目</label>
              <select
                className="filter-select"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="all">全部项目</option>
                {projects.map((project) => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>排序</label>
              <select
                className="filter-select"
                value={sortType}
                onChange={(e) => setSortType(e.target.value as SortType)}
              >
                <option value="newest">最新创建</option>
                <option value="oldest">最早创建</option>
                <option value="hot">热度排序</option>
              </select>
            </div>

            <div className="filter-group favorite-toggle-group">
              <label>只看收藏</label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={onlyFavorites}
                  onChange={(e) => setOnlyFavorites(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="board-stats">
        <span>共 {filteredInspirations.length} 条灵感</span>
      </div>

      <div className="masonry-grid">
        {filteredInspirations.map((inspiration, index) => (
          <div
            key={inspiration.id}
            className="inspiration-card"
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={() => setSelectedCard(inspiration)}
          >
            <div
              className="card-header"
              style={{
                background: `linear-gradient(135deg, #F39C12 0%, #E67E22 100%)`,
              }}
            >
              <h3 className="card-title">{inspiration.title}</h3>
              <span
                className="priority-tag"
                style={{ backgroundColor: PRIORITY_COLORS[inspiration.priority] }}
              >
                {inspiration.priority}
              </span>
            </div>

            <div className="card-body">
              <p className="card-description">{inspiration.description}</p>

              <div className="card-meta">
                <div className="meta-item">
                  <span className="meta-label">项目：</span>
                  <span className="meta-value">{inspiration.project}</span>
                </div>
                <div className="meta-item">
                  <span
                    className="type-tag"
                    style={{
                      backgroundColor: `${TYPE_COLORS[inspiration.type]}20`,
                      color: TYPE_COLORS[inspiration.type],
                      border: `1px solid ${TYPE_COLORS[inspiration.type]}40`,
                    }}
                  >
                    {TYPE_LABELS[inspiration.type]}
                  </span>
                </div>
              </div>

              <div className="card-tags">
                {inspiration.tags.map((tag) => (
                  <span
                    key={tag}
                    className="tag-chip"
                    style={{
                      backgroundColor: `${TYPE_COLORS[inspiration.type]}15`,
                      color: '#2C3E50',
                      border: `1px solid ${TYPE_COLORS[inspiration.type]}30`,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <button
              className={`favorite-btn ${inspiration.isFavorite ? 'favorited' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(inspiration.id);
              }}
              title={inspiration.isFavorite ? '取消收藏' : '收藏'}
            >
              <span className="star-icon">
                {inspiration.isFavorite ? '★' : '☆'}
              </span>
            </button>
          </div>
        ))}
      </div>

      {filteredInspirations.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>暂无符合条件的灵感</p>
          <p className="empty-hint">试试调整筛选条件，或者添加新的灵感吧</p>
        </div>
      )}

      {selectedCard && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedCard(null)}
            >
              ✕
            </button>

            <div
              className="modal-header"
              style={{
                background: `linear-gradient(135deg, #F39C12 0%, #E67E22 100%)`,
              }}
            >
              <h2>{selectedCard.title}</h2>
              <span
                className="priority-tag"
                style={{ backgroundColor: PRIORITY_COLORS[selectedCard.priority] }}
              >
                {selectedCard.priority}
              </span>
            </div>

            <div className="modal-body">
              <div className="modal-meta">
                <div className="meta-row">
                  <span className="meta-label">项目：</span>
                  <span className="meta-value">{selectedCard.project}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">类型：</span>
                  <span
                    className="type-tag"
                    style={{
                      backgroundColor: `${TYPE_COLORS[selectedCard.type]}20`,
                      color: TYPE_COLORS[selectedCard.type],
                      border: `1px solid ${TYPE_COLORS[selectedCard.type]}40`,
                    }}
                  >
                    {TYPE_LABELS[selectedCard.type]}
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">创建时间：</span>
                  <span className="meta-value">
                    {new Date(selectedCard.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">收藏数：</span>
                  <span className="meta-value">{selectedCard.favoriteCount}</span>
                </div>
              </div>

              <div className="modal-description">
                <h4>描述</h4>
                <p>{selectedCard.description}</p>
              </div>

              <div className="modal-tags">
                <h4>标签</h4>
                <div className="tags-list">
                  {selectedCard.tags.map((tag) => (
                    <span
                      key={tag}
                      className="tag-chip"
                      style={{
                        backgroundColor: `${TYPE_COLORS[selectedCard.type]}15`,
                        color: '#2C3E50',
                        border: `1px solid ${TYPE_COLORS[selectedCard.type]}30`,
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InspirationBoard;
