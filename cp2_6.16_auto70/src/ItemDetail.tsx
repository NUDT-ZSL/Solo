import { useMemo } from 'react';
import { Item } from './App';

interface ItemDetailProps {
  item: Item;
  allItems: Item[];
  onClose: () => void;
  onBorrow: (item: Item) => void;
  onReturn: (item: Item) => void;
}

function ItemDetail({ item, allItems, onClose, onBorrow, onReturn }: ItemDetailProps) {
  const recommended = useMemo(() => {
    return allItems
      .filter(it => it.category === item.category && it.id !== item.id)
      .slice(0, 4);
  }, [allItems, item.category, item.id]);

  const handleAction = () => {
    if (item.status === 'available') {
      onBorrow(item);
    } else {
      onReturn(item);
    }
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="关闭详情">
          ×
        </button>

        <div className="detail-header">
          {item.image ? (
            <img src={item.image} alt={item.name} className="detail-image" />
          ) : (
            <div className="detail-image placeholder">
              <span>📦</span>
            </div>
          )}
          <div className="detail-meta">
            <span className="category-tag detail-category">{item.category}</span>
            <h2 className="detail-name">{item.name}</h2>
            <div
              className={`status-badge-lg ${
                item.status === 'available' ? 'status-available' : 'status-borrowed'
              }`}
            >
              {item.status === 'available' ? '✓ 可借用' : '○ 已借出'}
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3 className="section-title">物品描述</h3>
          <p className="detail-description">{item.description}</p>
        </div>

        <div className="detail-section">
          <h3 className="section-title">当前状态</h3>
          {item.status === 'available' ? (
            <div className="status-info status-info-available">
              <div className="status-dot status-dot-green"></div>
              <span>物品目前在库，随时可以预约借用</span>
            </div>
          ) : (
            <div className="status-info status-info-borrowed">
              <div className="status-dot status-dot-orange"></div>
              <div>
                <div>
                  借用人：<strong>{item.borrower}</strong>
                </div>
                <div className="borrow-date">借用日期：{item.borrowDate}</div>
              </div>
            </div>
          )}
        </div>

        <div className="detail-action-row">
          <button
            className={`btn btn-detail ${
              item.status === 'available' ? 'btn-primary' : 'btn-return'
            }`}
            onClick={handleAction}
          >
            {item.status === 'available' ? '立即预约借用' : '确认已归还'}
          </button>
        </div>

        {recommended.length > 0 && (
          <div className="detail-section">
            <h3 className="section-title">同分类推荐</h3>
            <div className="recommend-grid">
              {recommended.map(rec => (
                <div key={rec.id} className="recommend-card">
                  {rec.image ? (
                    <img src={rec.image} alt={rec.name} />
                  ) : (
                    <div className="recommend-placeholder">📦</div>
                  )}
                  <div className="recommend-info">
                    <span className="recommend-name">{rec.name}</span>
                    <span
                      className={`recommend-status ${
                        rec.status === 'available' ? 'rec-avail' : 'rec-borrowed'
                      }`}
                    >
                      {rec.status === 'available' ? '可借' : '已借出'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ItemDetail;
