import { useNavigate } from 'react-router-dom';
import type { Item, ItemStatus } from '../types';
import '../styles/components.css';

interface ItemCardProps {
  item: Item;
  onApply?: (item: Item) => void;
}

const statusConfig: Record<ItemStatus, { color: string; label: string }> = {
  published: { color: '#4caf50', label: '已发布' },
  applied: { color: '#ff9800', label: '已申请' },
  claimed: { color: '#9e9e9e', label: '已领取' },
};

export function ItemCard({ item, onApply }: ItemCardProps) {
  const navigate = useNavigate();
  const status = statusConfig[item.status];

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.status !== 'claimed' && onApply) {
      onApply(item);
    }
  };

  const handleDetailClick = () => {
    navigate(`/items/${item.id}`);
  };

  return (
    <div className="item-card" onClick={handleDetailClick}>
      <div className="item-card-image-container">
        <img src={item.image} alt={item.title} className="item-card-image" />
        <div className="item-card-status-badge">
          <span className="item-card-status-dot" style={{ backgroundColor: status.color }}></span>
          <span className="item-card-status-text">{status.label}</span>
        </div>
      </div>

      <div className="item-card-content">
        <h3 className="item-card-title">{item.title}</h3>
        <span className="item-card-category">{item.category}</span>
        <p className="item-card-description">{item.description}</p>
        
        <div className="item-card-footer">
          <div className="item-card-publisher-info">
            <img src={item.publisherAvatar} alt={item.publisher} className="item-card-avatar" />
            <span className="item-card-publisher-name">{item.publisher}</span>
          </div>
          <div className="item-card-button-container">
            <button
              className={`item-card-button item-card-apply-button ${item.status === 'claimed' ? 'item-card-disabled-button' : ''}`}
              onClick={handleApplyClick}
              disabled={item.status === 'claimed'}
            >
              申请领取
            </button>
            <button
              className="item-card-button item-card-detail-button"
              onClick={(e) => {
                e.stopPropagation();
                handleDetailClick();
              }}
            >
              查看详情
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItemCard;
