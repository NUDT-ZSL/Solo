import { useState, useCallback, useMemo, memo } from 'react';
import api, { BeanSummary } from './api';

const ALL_FLAVORS = ['果酸', '花香', '坚果', '巧克力', '焦糖', '草本', '酒香'];
const BREW_METHODS = ['手冲', '意式浓缩', '法压壶'];

const FlavorTag = memo(function FlavorTag({
  flavor,
  selected,
  onClick,
}: {
  flavor: string;
  selected: boolean;
  onClick: (f: string) => void;
}) {
  return (
    <div
      className={`flavor-tag${selected ? ' selected' : ''}`}
      onClick={() => onClick(flavor)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(flavor)}
    >
      {flavor}
    </div>
  );
});

const BrewPill = memo(function BrewPill({
  method,
  selected,
  onClick,
}: {
  method: string;
  selected: boolean;
  onClick: (m: string) => void;
}) {
  return (
    <div
      className={`brew-pill${selected ? ' selected' : ''}`}
      onClick={() => onClick(method)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(method)}
    >
      {method}
    </div>
  );
});

const Stars = memo(function Stars({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) {
  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 5; i++) {
      let cls = 'star';
      if (i < Math.floor(value)) {
        cls += ' filled';
      } else if (i < value) {
        cls += ' half';
      }
      arr.push(
        <span key={i} className={cls} style={{ fontSize: `${size}px` }}>
          ★
        </span>
      );
    }
    return arr;
  }, [value, size]);

  return <span className="stars">{stars}</span>;
});

const BeanCard = memo(function BeanCard({
  bean,
  onClick,
}: {
  bean: BeanSummary;
  onClick: (b: BeanSummary) => void;
}) {
  const roastClass = useMemo(() => {
    switch (bean.roastLevel) {
      case '浅':
        return 'light';
      case '深':
        return 'dark';
      default:
        return 'medium';
    }
  }, [bean.roastLevel]);

  return (
    <div className="bean-card" onClick={() => onClick(bean)} role="article">
      <div className="bean-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bean-name">{bean.name}</div>
          <div className="bean-origin">{bean.origin}</div>
        </div>
        <div className="roast-bar">
          <span className="roast-label">{bean.roastLevel}烘</span>
          <div className="roast-track">
            <div className={`roast-fill ${roastClass}`} />
          </div>
        </div>
      </div>

      <div className="bean-tags">
        {bean.flavors.slice(0, 4).map((tag) => (
          <span key={tag} className="bean-tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="bean-footer">
        <div className="bean-price">
          ¥{bean.price}
          <span className="bean-price-unit"> /100g</span>
        </div>
        <div className="match-stars">
          <Stars value={bean.matchStars} size={15} />
          <span className="match-text">{bean.matchScore}%</span>
        </div>
      </div>
    </div>
  );
});

interface RecommendPageProps {
  onBeanClick: (bean: BeanSummary) => void;
}

function RecommendPage({ onBeanClick }: RecommendPageProps) {
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [brewMethod, setBrewMethod] = useState<string>('手冲');
  const [maxBudget, setMaxBudget] = useState<number>(200);
  const [minBudget] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<BeanSummary[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const toggleFlavor = useCallback((flavor: string) => {
    setSelectedFlavors((prev) => {
      if (prev.includes(flavor)) {
        return prev.filter((f) => f !== flavor);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, flavor];
    });
  }, []);

  const selectBrew = useCallback((method: string) => {
    setBrewMethod(method);
  }, []);

  const progress = useMemo(() => {
    const range = 300 - 50;
    const val = Math.max(0, Math.min(1, (maxBudget - 50) / range));
    return `${Math.round(val * 100)}%`;
  }, [maxBudget]);

  const canSubmit = selectedFlavors.length >= 3 && selectedFlavors.length <= 5;

  const handleSearch = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const res = await api.getBeansByPreferences({
        flavors: selectedFlavors,
        brewMethod,
        minBudget,
        maxBudget,
      });
      setResults(res.data || []);
    } catch (err: any) {
      setError(err.message || '获取推荐结果失败，请稍后重试');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFlavors, brewMethod, minBudget, maxBudget, canSubmit]);

  return (
    <>
      <h1 className="page-title">寻找专属于你的咖啡豆</h1>
      <p className="page-subtitle">
        选择你的风味偏好、冲煮方式和预算，BeanOracle 将为你智能匹配最适合的精品咖啡豆
      </p>

      <div className="card card-lg" style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">
            风味偏好
            <span style={{ fontSize: 13, fontWeight: 400, color: '#8b7355', marginLeft: 8 }}>
              请选择 3-5 种 ({selectedFlavors.length}/5)
            </span>
          </div>
          <div className="flavor-group">
            {ALL_FLAVORS.map((flavor) => (
              <FlavorTag
                key={flavor}
                flavor={flavor}
                selected={selectedFlavors.includes(flavor)}
                onClick={toggleFlavor}
              />
            ))}
          </div>
          {selectedFlavors.length > 0 && selectedFlavors.length < 3 && (
            <div style={{ fontSize: 13, color: '#d97706', marginTop: 10 }}>
              至少选择 3 种风味标签
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div className="section-title">冲煮方式</div>
          <div className="brew-group">
            {BREW_METHODS.map((method) => (
              <BrewPill
                key={method}
                method={method}
                selected={brewMethod === method}
                onClick={selectBrew}
              />
            ))}
          </div>
        </div>

        <div className="budget-section">
          <div className="budget-header">
            <div className="section-title" style={{ marginBottom: 0 }}>
              预算上限
            </div>
            <div className="budget-value">
              ¥{maxBudget}
              <span className="budget-unit"> /100g</span>
            </div>
          </div>
          <div className="slider-container">
            <input
              type="range"
              min={50}
              max={300}
              step={10}
              value={maxBudget}
              onChange={(e) => setMaxBudget(Number(e.target.value))}
              style={{ ['--progress' as any]: progress }}
              aria-label="预算滑块"
            />
            <div className="budget-range">
              <span>¥50</span>
              <span>¥300</span>
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleSearch}
          disabled={loading || !canSubmit}
        >
          {loading ? (
            <>
              <span
                className="spinner"
                style={{ width: 18, height: 18, borderWidth: 3 }}
              />
              正在寻找...
            </>
          ) : (
            <>寻找我的豆子</>
          )}
        </button>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid #fee2e2', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div className="loading-text">正在为你匹配最适合的咖啡豆...</div>
        </div>
      )}

      {!loading && hasSearched && results.length > 0 && (
        <>
          <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: 20 }}>
            为你推荐 {results.length} 款咖啡豆
          </h2>
          <div className="results-grid">
            {results.map((bean) => (
              <BeanCard key={bean.id} bean={bean} onClick={onBeanClick} />
            ))}
          </div>
        </>
      )}

      {!loading && hasSearched && results.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">☕️</div>
          <div className="empty-title">暂无匹配结果</div>
          <div className="empty-text">
            尝试调整风味偏好或提高预算上限，BeanOracle 会为你找到更多选择
          </div>
        </div>
      )}
    </>
  );
}

export default memo(RecommendPage);
