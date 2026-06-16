import React, { useState, useEffect } from 'react';
import type { CoffeeBean, RoastLevel, CreateBatchRequest } from '../types';

interface BatchFormProps {
  isOpen: boolean;
  beans: CoffeeBean[];
  preselectedBeanId?: string | null;
  onClose: () => void;
  onSubmit: (data: CreateBatchRequest) => void;
}

const BatchForm: React.FC<BatchFormProps> = ({
  isOpen,
  beans,
  preselectedBeanId,
  onClose,
  onSubmit,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    beanId: '',
    roastDate: today,
    roastLevel: 'medium' as RoastLevel,
    flavorNotes: '',
    inputTemp: 200,
    outputTemp: 120,
    roastDuration: 900,
  });

  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen && preselectedBeanId) {
      setFormData(prev => ({ ...prev, beanId: preselectedBeanId }));
    } else if (isOpen) {
      setFormData({
        beanId: beans[0]?.id || '',
        roastDate: today,
        roastLevel: 'medium',
        flavorNotes: '',
        inputTemp: 200,
        outputTemp: 120,
        roastDuration: 900,
      });
    }
    setIsClosing(false);
  }, [isOpen, preselectedBeanId, beans, today]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.beanId) return;
    onSubmit(formData);
    handleClose();
  };

  const handleRoastLevelChange = (level: RoastLevel) => {
    setFormData(prev => ({ ...prev, roastLevel: level }));
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`batch-form-overlay ${isClosing ? 'closing' : ''}`}>
      <div className={`batch-form-panel ${isClosing ? 'closing' : ''}`}>
        <div className="form-header">
          <h2>创建烘焙批次</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="batch-form">
          <div className="form-group">
            <label htmlFor="beanSelect">选择生豆</label>
            <select
              id="beanSelect"
              value={formData.beanId}
              onChange={(e) => setFormData(prev => ({ ...prev, beanId: e.target.value }))}
              required
            >
              {beans.map(bean => (
                <option key={bean.id} value={bean.id}>
                  {bean.name} ({bean.stockKg.toFixed(1)} kg)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="roastDate">烘焙日期</label>
            <input
              type="date"
              id="roastDate"
              value={formData.roastDate}
              onChange={(e) => setFormData(prev => ({ ...prev, roastDate: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label>烘焙度</label>
            <div className="roast-level-group">
              {(['light', 'medium', 'dark'] as RoastLevel[]).map((level) => (
                <label
                  key={level}
                  className={`roast-pill ${formData.roastLevel === level ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="roastLevel"
                    value={level}
                    checked={formData.roastLevel === level}
                    onChange={() => handleRoastLevelChange(level)}
                    style={{ display: 'none' }}
                  />
                  {level === 'light' ? '浅烘' : level === 'medium' ? '中烘' : '深烘'}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="flavorNotes">风味备注</label>
            <textarea
              id="flavorNotes"
              rows={3}
              value={formData.flavorNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, flavorNotes: e.target.value }))}
              placeholder="描述本次烘焙的风味特点..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="inputTemp">
              入豆温度: <span className="temp-value">{formData.inputTemp}°C</span>
            </label>
            <div className="slider-container">
              <input
                type="range"
                id="inputTemp"
                min={100}
                max={240}
                value={formData.inputTemp}
                onChange={(e) => setFormData(prev => ({ ...prev, inputTemp: Number(e.target.value) }))}
                className="gradient-slider"
              />
              <div className="slider-range">100°C - 240°C</div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="outputTemp">
              出豆温度: <span className="temp-value">{formData.outputTemp}°C</span>
            </label>
            <div className="slider-container">
              <input
                type="range"
                id="outputTemp"
                min={100}
                max={240}
                value={formData.outputTemp}
                onChange={(e) => setFormData(prev => ({ ...prev, outputTemp: Number(e.target.value) }))}
                className="gradient-slider"
              />
              <div className="slider-range">100°C - 240°C</div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              取消
            </button>
            <button type="submit" className="btn-primary">
              提交烘焙批次
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchForm;
