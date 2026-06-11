import React, { useState, useEffect } from 'react';
import { Card, Priority } from '../types';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    priority: Priority;
  }) => void;
  editingCard?: Card | null;
  initialStatus?: Card['status'];
}

export const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingCard,
  initialStatus,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');

  useEffect(() => {
    if (isOpen) {
      if (editingCard) {
        setTitle(editingCard.title);
        setDescription(editingCard.description);
        setPriority(editingCard.priority);
      } else {
        setTitle('');
        setDescription('');
        setPriority('medium');
      }
    }
  }, [isOpen, editingCard]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{editingCard ? '编辑需求' : '新建需求'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="card-title">标题 *</label>
            <input
              id="card-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入需求标题..."
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="card-description">描述</label>
            <textarea
              id="card-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入需求详细描述..."
              rows={4}
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label>优先级</label>
            <div className="priority-options">
              <label className={`priority-option priority-option-high ${priority === 'high' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priority"
                  value="high"
                  checked={priority === 'high'}
                  onChange={() => setPriority('high')}
                />
                <span className="priority-dot" />
                高优先级
              </label>
              <label className={`priority-option priority-option-medium ${priority === 'medium' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priority"
                  value="medium"
                  checked={priority === 'medium'}
                  onChange={() => setPriority('medium')}
                />
                <span className="priority-dot" />
                中优先级
              </label>
              <label className={`priority-option priority-option-low ${priority === 'low' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priority"
                  value="low"
                  checked={priority === 'low'}
                  onChange={() => setPriority('low')}
                />
                <span className="priority-dot" />
                低优先级
              </label>
            </div>
          </div>

          {initialStatus && !editingCard && (
            <div className="form-group">
              <label>目标列</label>
              <div className="status-display">
                {initialStatus === 'todo' && '待办'}
                {initialStatus === 'in-progress' && '进行中'}
                {initialStatus === 'done' && '已完成'}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!title.trim()}
            >
              {editingCard ? '保存修改' : '创建需求'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
