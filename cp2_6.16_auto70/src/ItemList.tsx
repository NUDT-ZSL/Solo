import React, { memo } from 'react';
import { Item } from './App';

interface ItemCardProps {
  item: Item;
  onClick: () => void;
  onBorrow: (item: Item) => void;
  onReturn: (item: Item) => void;
}

const ItemCard = memo(function ItemCard({ item, onClick, onBorrow, onReturn }: ItemCardProps) {
  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.status === 'available') {
      onBorrow(item);
    } else {
      onReturn(item);
    }
  };

  return (
    <div className="item-card" onClick={onClick}>
      <div className="item-image">
        {item.image ? (
          <img src={item.image} alt={item.name} />
        ) : (
          <div className="image-placeholder">
            <span>📦</span>
          </div>
        )}
        <span
          className={`status-badge ${item.status === 'available' ? 'status-available' : 'status-borrowed'}`}
        >
          {item.status === 'available' ? '可借用' : '已借出'}
        </span>
      </div>
      <div className="item-info">
        <span className="category-tag">{item.category}</span>
        <h3 className="item-name">{item.name}</h3>
        <button
          className={`btn btn-card ${item.status === 'available' ? 'btn-primary' : 'btn-return'}`}
          onClick={handleActionClick}
        >
          {item.status === 'available' ? '立即借用' : '确认归还'}
        </button>
      </div>
    </div>
  );
});

interface SkeletonCardProps {
  key?: string | number;
}

function SkeletonCard({}: SkeletonCardProps) {
  return (
    <div className="item-card skeleton-card">
      <div className="skeleton skeleton-image shimmer"></div>
      <div className="item-info">
        <div className="skeleton skeleton-tag shimmer"></div>
        <div className="skeleton skeleton-title shimmer"></div>
        <div className="skeleton skeleton-btn shimmer"></div>
      </div>
    </div>
  );
}

interface ItemListProps {
  items: Item[];
  loading: boolean;
  onItemClick: (item: Item) => void;
  onBorrow: (item: Item) => void;
  onReturn: (item: Item) => void;
}

function ItemList({ items, loading, onItemClick, onBorrow, onReturn }: ItemListProps) {
  const grouped = items.reduce<Record<string, Item[]>>((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const categoryOrder = Object.keys(grouped);

  return (
    <div className="item-list-container">
      {loading ? (
        <div className="item-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        categoryOrder.map(category => (
          <section key={category} className="category-section">
            <div className="category-header">
              <span className="category-icon">📂</span>
              <h2 className="category-title">{category}</h2>
              <span className="category-count">{grouped[category].length} 件物品</span>
            </div>
            <div className="item-grid">
              {grouped[category].map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick(item)}
                  onBorrow={onBorrow}
                  onReturn={onReturn}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default ItemList;
