import React, { useMemo } from 'react';
import { Star, Trash2 } from 'lucide-react';
import type { FavoriteEntry, HSL } from '../utils/colorUtils';
import { hslToHex } from '../utils/colorUtils';

interface FavoritesBarProps {
  isOpen: boolean;
  favorites: readonly FavoriteEntry[];
  onSelect: (primary: HSL) => void;
  onClear: () => void;
}

const SAFE_TIMESTAMP = 0;

const formatTime = (ts: unknown): string => {
  const timestamp = typeof ts === 'number' && Number.isFinite(ts) ? ts : SAFE_TIMESTAMP;
  const d = new Date(timestamp || Date.now());
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const FavoritesBar: React.FC<FavoritesBarProps> = ({
  isOpen,
  favorites,
  onSelect,
  onClear,
}) => {
  const safeFavorites = useMemo(() => {
    if (!Array.isArray(favorites)) return [] as readonly FavoriteEntry[];
    return favorites
      .filter((e): e is FavoriteEntry => !!e && typeof e.id === 'string')
      .slice();
  }, [favorites]);

  const sortedFavorites = useMemo(() => {
    return [...safeFavorites].sort((a, b) => {
      const ta = typeof a.timestamp === 'number' && Number.isFinite(a.timestamp) ? a.timestamp : SAFE_TIMESTAMP;
      const tb = typeof b.timestamp === 'number' && Number.isFinite(b.timestamp) ? b.timestamp : SAFE_TIMESTAMP;
      return tb - ta;
    });
  }, [safeFavorites]);

  return (
    <aside
      className="favorites-bar"
      style={{
        width: isOpen ? 280 : 0,
        minWidth: isOpen ? 280 : 0,
        maxWidth: isOpen ? 280 : 0,
        overflow: 'hidden',
      }}
      aria-hidden={!isOpen}
    >
      <div style={{ width: 280, minWidth: 280, maxWidth: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="favorites-header">
          <div className="favorites-title">
            <Star size={16} fill="currentColor" color="#f59e0b" />
            <span>收藏方案</span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontWeight: 500,
              }}
            >
              {sortedFavorites.length}
            </span>
          </div>
          {sortedFavorites.length > 0 && (
            <button
              className="favorites-clear"
              onClick={onClear}
              title="清空所有收藏"
              type="button"
            >
              <Trash2
                size={12}
                style={{
                  display: 'inline-block',
                  marginRight: 4,
                  verticalAlign: '-2px',
                }}
              />
              清空
            </button>
          )}
        </div>

        <div className="favorites-list">
          {sortedFavorites.length === 0 ? (
            <div className="favorite-empty">
              <Star size={36} strokeWidth={1.2} color="#4b5563" />
              <div>暂无收藏</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                点击顶部星标按钮收藏当前配色方案
              </div>
            </div>
          ) : (
            sortedFavorites.map((entry) => {
              const safePrimary: HSL =
                entry.primary &&
                typeof entry.primary.h === 'number' &&
                typeof entry.primary.s === 'number' &&
                typeof entry.primary.l === 'number'
                  ? entry.primary
                  : { h: 0, s: 0, l: 50 };
              const safeSchemes = Array.isArray(entry.schemes) ? entry.schemes : [];
              const firstScheme = safeSchemes[0];
              const previewColors = firstScheme && Array.isArray(firstScheme.colors)
                ? firstScheme.colors.slice(0, 4)
                : [];
              return (
                <div
                  key={entry.id}
                  className="favorite-item"
                  onClick={() => onSelect(safePrimary)}
                  title="点击恢复此配色方案"
                  role="button"
                  tabIndex={0}
                >
                  <div className="favorite-item-header">
                    <span className="favorite-item-type">
                      {firstScheme?.name ? `${firstScheme.name}等方案` : '配色方案'}
                    </span>
                    <span className="favorite-item-time">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  <div className="favorite-item-colors">
                    <div
                      className="favorite-thumb"
                      style={{ backgroundColor: hslToHex(safePrimary) }}
                      title="主色"
                    />
                    {previewColors.map((c, i) => {
                      const validColor: HSL =
                        c && typeof c.h === 'number' && typeof c.s === 'number' && typeof c.l === 'number'
                          ? c
                          : { h: 0, s: 0, l: 80 };
                      return (
                        <div
                          key={i}
                          className="favorite-thumb"
                          style={{ backgroundColor: hslToHex(validColor) }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};

export default FavoritesBar;
