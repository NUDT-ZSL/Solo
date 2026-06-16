import React from 'react';
import { SpecialDrink } from '../types';
import './CreateOrderModal.css';

interface CreateOrderModalProps {
  open: boolean;
  specials: SpecialDrink[];
  onClose: () => void;
  onSubmit: (data: { targetDrinkId: string; targetDrinkName: string; duration: number; tableNumber: number }) => void;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ open, specials, onClose, onSubmit }) => {
  const [drinkId, setDrinkId] = React.useState(specials[0]?.id || '');
  const [duration, setDuration] = React.useState(30);
  const [tableNumber, setTableNumber] = React.useState<number>(1);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open && specials.length > 0 && !drinkId) {
      setDrinkId(specials[0].id);
    }
  }, [open, specials]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!drinkId) {
      setError('请选择饮品');
      return;
    }
    if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 20) {
      setError('桌号必须是1-20之间的整数');
      return;
    }
    const selectedDrink = specials.find((s) => s.id === drinkId);
    if (!selectedDrink) {
      setError('饮品无效');
      return;
    }
    onSubmit({
      targetDrinkId: drinkId,
      targetDrinkName: selectedDrink.name,
      duration,
      tableNumber
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-order-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="create-order-title">发起拼单</h2>
        <form className="create-order-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">选择目标饮品</label>
            <select
              className="form-select"
              value={drinkId}
              onChange={(e) => setDrinkId(e.target.value)}
            >
              {specials.map((s) => (
                <option key={s.id} value={s.id}>{s.name} - ¥{s.price}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">拼单截止时间</label>
            <div className="radio-group">
              {[15, 30, 60].map((m) => (
                <label key={m} className={`radio-item ${duration === m ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="duration"
                    value={m}
                    checked={duration === m}
                    onChange={() => setDuration(m)}
                  />
                  <span>{m} 分钟</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">碰头桌号（1-20）</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={20}
              value={tableNumber}
              onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary">发起拼单</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;
