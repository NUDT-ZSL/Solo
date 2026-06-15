import React, { useState } from 'react';
import './CreateActivityModal.css';

interface CreateActivityModalProps {
  recipeId: string;
  recipeTitle: string;
  currentUser: string;
  onSubmit: (data: {
    recipeId: string;
    name: string;
    host: string;
    maxParticipants: number;
    startTime?: number;
  }) => void;
  onCancel: () => void;
}

const CreateActivityModal: React.FC<CreateActivityModalProps> = ({
  recipeId,
  recipeTitle,
  currentUser,
  onSubmit,
  onCancel
}) => {
  const [name, setName] = useState(`${recipeTitle} - 烹饪活动`);
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('请输入活动名称');
      return;
    }

    let startTimestamp: number | undefined;
    if (startDate && startTime) {
      startTimestamp = new Date(`${startDate}T${startTime}`).getTime();
    }

    onSubmit({
      recipeId,
      name: name.trim(),
      host: currentUser,
      maxParticipants,
      startTime: startTimestamp
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>创建烹饪活动</h2>
          <button className="close-btn" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>活动名称 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：周末番茄炒蛋聚会"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>菜谱</label>
              <div className="recipe-preview">
                <span className="recipe-icon">🍳</span>
                <span className="recipe-name">{recipeTitle}</span>
              </div>
            </div>

            <div className="form-group">
              <label>最大参与人数</label>
              <div className="participants-selector">
                {[3, 5, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`participant-option ${
                      maxParticipants === num ? 'selected' : ''
                    }`}
                    onClick={() => setMaxParticipants(num)}
                  >
                    {num}人
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>开始时间（可选）</label>
              <div className="datetime-inputs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={onCancel}>
                取消
              </button>
              <button type="submit" className="submit-btn">
                创建活动
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateActivityModal;
