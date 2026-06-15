import { useState } from 'react';
import { SavedOutfit } from '../types';

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  savedOutfits: SavedOutfit[];
}

export default function SaveDialog({ isOpen, onClose, onSave, savedOutfits }: SaveDialogProps) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setName('');
      onClose();
    }
  };

  const handleDelete = (id: string) => {
    const stored = localStorage.getItem('savedOutfits');
    if (stored) {
      const all: SavedOutfit[] = JSON.parse(stored);
      const filtered = all.filter(o => o.id !== id);
      localStorage.setItem('savedOutfits', JSON.stringify(filtered));
      window.location.reload();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>保存搭配方案</h3>
        <p className="modal-hint">最多保存10个方案（当前：{savedOutfits.length}/10）</p>

        {savedOutfits.length >= 10 && (
          <div className="warning-message">
            方案数量已满，请先删除旧方案
          </div>
        )}

        <div className="save-input-row">
          <input
            type="text"
            className="name-input"
            placeholder="请输入方案名称"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={savedOutfits.length >= 10}
          />
          <button
            className="save-confirm-btn"
            onClick={handleSave}
            disabled={savedOutfits.length >= 10 || !name.trim()}
          >
            保存
          </button>
        </div>

        {savedOutfits.length > 0 && (
          <div className="saved-list">
            <h4>已保存方案</h4>
            {savedOutfits.map(outfit => (
              <div key={outfit.id} className="saved-item">
                <div className="saved-item-info">
                  <strong>{outfit.name}</strong>
                  <span className="saved-item-desc">{outfit.description}</span>
                </div>
                <button className="delete-btn" onClick={() => handleDelete(outfit.id)}>
                  删除
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="close-btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
