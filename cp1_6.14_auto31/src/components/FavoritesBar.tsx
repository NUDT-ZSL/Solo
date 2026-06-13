import React from 'react';
import { Star, Trash2 } from 'lucide-react';
import type { FavoriteEntry, HSL } from '../utils/colorUtils';
import { hslToHex } from '../utils/colorUtils';

interface FavoritesBarProps {
  isOpen: boolean;
  favorites: FavoriteEntry[];
  onSelect: (primary: HSL) => void;
  onClear: () => void;
}

const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp);
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
  return (
    <aside
      className="favorites-bar"
      style={{
        width: isOpen ? 280 : 0,
      }}
    >
      {isOpen && (
        <>
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
                {favorites.length}
              </span>
            </div>
            {favorites.length > 0 && (
              <button
                className="favorites-clear"
                onClick={onClear}
                title="清空所有收藏"
              >
                <Trash2 size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />
                清空
              </button>
            )}
          </div>

          <div className="favorites-list">
            {favorites.length === 0 ? (
              <div className="favorite-empty">
                <Star size={36} strokeWidth={1.2} color="#4b5563" />
                <div>暂无收藏</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  点击顶部星标按钮收藏当前配色方案
                </div>
              </div>
            ) : (
              favorites.map((entry) => (
                <div
                  key={entry.id}
                  className="favorite-item"
                  onClick={() => onSelect(entry.primary)}
                  title="点击恢复此配色方案"
                >
                  <div className="favorite-item-header">
                    <span className="favorite-item-type">
                      {entry.schemes.length > 0
                        ? entry.schemes[0].name + '等方案'
                        : '配色方案'}
                    </span>
                    <span className="favorite-item-time">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  <div className="favorite-item-colors">
                    <div
                      className="favorite-thumb"
                      style={{ backgroundColor: hslToHex(entry.primary) }}
                      title="主色"
                    />
                    {entry.schemes[0]?.colors.slice(0, 4).map((c, i) => (
                      <div
                        key={i}
                        className="favorite-thumb"
                        style={{ backgroundColor: hslToHex(c) }}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
};

export default FavoritesBar;
