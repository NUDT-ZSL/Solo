import { SavedOutfit } from '../types';

interface LoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  savedOutfits: SavedOutfit[];
  onLoad: (outfit: SavedOutfit) => void;
}

export default function LoadDialog({ isOpen, onClose, savedOutfits, onLoad }: LoadDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>加载搭配方案</h3>

        {savedOutfits.length === 0 ? (
          <p className="empty-message">暂无已保存的方案</p>
        ) : (
          <div className="saved-list">
            {savedOutfits.map(outfit => (
              <div key={outfit.id} className="saved-item clickable" onClick={() => onLoad(outfit)}>
                <div className="saved-item-info">
                  <strong>{outfit.name}</strong>
                  <span className="saved-item-desc">{outfit.description}</span>
                </div>
                <span className="load-hint">点击加载</span>
              </div>
            ))}
          </div>
        )}

        <button className="close-btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
