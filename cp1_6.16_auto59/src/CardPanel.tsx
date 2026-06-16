import React, { useState, useEffect } from 'react';
import { CheckInRecord, Province } from './data';

interface CardPanelProps {
  checkIns: CheckInRecord[];
  currentProvince: Province | null;
  isAddMode?: boolean;
  onAddCheckIn?: (record: Omit<CheckInRecord, 'id' | 'createdAt'>) => void;
  onUpdateCheckIn?: (id: string, updates: Partial<CheckInRecord>) => void;
  onDeleteCheckIn?: (id: string) => void;
  onFormClose?: () => void;
}

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: 'small' | 'medium';
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  readOnly = false,
  size = 'medium'
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [bounceStar, setBounceStar] = useState<number | null>(null);
  const starSize = size === 'small' ? '16px' : '20px';

  const handleClick = (star: number) => {
    if (readOnly || !onRatingChange) return;
    setBounceStar(star);
    onRatingChange(star);
    setTimeout(() => setBounceStar(null), 200);
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="star-rating" style={{ gap: size === 'small' ? '2px' : '4px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`star ${displayRating >= i ? 'filled' : ''} ${!readOnly ? 'clickable' : ''} ${bounceStar === i ? 'bounce' : ''}`}
          style={{ fontSize: starSize }}
          onClick={() => handleClick(i)}
          onMouseEnter={() => !readOnly && setHoverRating(i)}
          onMouseLeave={() => !readOnly && setHoverRating(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

interface CheckInFormProps {
  province: Province;
  initialData?: CheckInRecord;
  onSubmit: (data: Omit<CheckInRecord, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const CheckInForm: React.FC<CheckInFormProps> = ({
  province,
  initialData,
  onSubmit,
  onCancel
}) => {
  const [restaurantName, setRestaurantName] = useState(initialData?.restaurantName || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [rating, setRating] = useState(initialData?.rating || 3);
  const [review, setReview] = useState(initialData?.review || '');

  const isEditing = !!initialData;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim()) return;

    const position = initialData?.position || {
      x: province.center.x + (Math.random() - 0.5) * 30,
      y: province.center.y + (Math.random() - 0.5) * 30
    };

    onSubmit({
      provinceId: province.id,
      restaurantName: restaurantName.trim(),
      address: address.trim(),
      rating,
      review: review.trim(),
      position
    });
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">
          {isEditing ? '编辑打卡' : '添加打卡'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">餐厅名称 *</label>
            <input
              type="text"
              className="form-input"
              value={restaurantName}
              onChange={e => setRestaurantName(e.target.value)}
              placeholder="请输入餐厅名称"
              autoFocus
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="form-label">地址</label>
            <input
              type="text"
              className="form-input"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="请输入餐厅地址"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label">评分</label>
            <StarRating rating={rating} onRatingChange={setRating} />
          </div>

          <div className="form-group">
            <label className="form-label">评价</label>
            <textarea
              className="form-textarea"
              value={review}
              onChange={e => {
                if (e.target.value.length <= 200) {
                }
                setReview(e.target.value.slice(0, 200));
              }}
              placeholder="写下你的美食体验..."
              rows={4}
            />
            <div className="char-count">{review.length}/200</div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!restaurantName.trim()}
            >
              {isEditing ? '保存' : '提交'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CardPanel: React.FC<CardPanelProps> = ({
  checkIns,
  currentProvince,
  isAddMode = false,
  onAddCheckIn,
  onUpdateCheckIn,
  onDeleteCheckIn,
  onFormClose
}) => {
  const [editingRecord, setEditingRecord] = useState<CheckInRecord | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isAddMode && currentProvince && !editingRecord) {
      setShowForm(true);
    } else if (!isAddMode && !editingRecord && showForm) {
      setShowForm(false);
    }
  }, [isAddMode, currentProvince, editingRecord, showForm]);

  const sortedCheckIns = [...checkIns].sort((a, b) => b.createdAt - a.createdAt);

  const handleAdd = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const handleEdit = (record: CheckInRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleFormSubmit = (data: Omit<CheckInRecord, 'id' | 'createdAt'>) => {
    if (editingRecord && onUpdateCheckIn) {
      onUpdateCheckIn(editingRecord.id, data);
    } else if (onAddCheckIn) {
      onAddCheckIn(data);
    }
    setShowForm(false);
    setEditingRecord(null);
    onFormClose?.();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
    onFormClose?.();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这条打卡记录吗？')) {
      onDeleteCheckIn?.(id);
    }
  };

  const title = currentProvince ? `${currentProvince.name}打卡记录` : '选择省份查看打卡';

  return (
    <div className="card-panel">
      <div className="card-panel-header">
        <h2 className="card-panel-title">{title}</h2>
        <p className="card-panel-count">
          共 {checkIns.length} 条打卡记录
        </p>
      </div>

      <div className="card-list">
        {sortedCheckIns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <p className="empty-text">
              {currentProvince
                ? '还没有打卡记录\n点击地图上的加号添加你的第一个美食打卡吧！'
                : '请在地图上双击一个省份开始打卡'}
            </p>
          </div>
        ) : (
          sortedCheckIns.map(record => (
            <div key={record.id} className="checkin-card">
            <div className="card-color-bar" />
            <div className="card-content">
              <h3 className="card-name">{record.restaurantName}</h3>
              {record.address && (
                <p className="card-address">📍 {record.address}</p>
              )}
              <div className="card-rating">
                <StarRating rating={record.rating} readOnly size="small" />
              </div>
              {record.review && (
                <p className="card-review">{record.review}</p>
              )}
              <div className="card-actions">
                <button
                  className="card-btn"
                  onClick={() => handleEdit(record)}
                >
                  编辑
                </button>
                <button
                  className="card-btn delete"
                  onClick={() => handleDelete(record.id)}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))
      )}
      </div>

      {showForm && currentProvince && (
        <CheckInForm
          province={currentProvince}
          initialData={editingRecord || undefined}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
};

export default CardPanel;
