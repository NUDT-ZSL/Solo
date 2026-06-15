import React, { useState } from 'react';
import { Droplets, Leaf, Sun, StickyNote } from 'lucide-react';
import { plantManager } from './PlantManager';
import type { LogFormData } from './types';

interface LogFormProps {
  plantId: number;
  onSuccess?: () => void;
}

const LogForm: React.FC<LogFormProps> = ({ plantId, onSuccess }) => {
  const today = plantManager.getTodayDate();
  const [formData, setFormData] = useState<LogFormData>({
    date: today,
    watered: false,
    fertilized: false,
    lightHours: 6,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const result = await plantManager.recordLog(plantId, formData);
    
    setSubmitting(false);
    
    if (result) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setFormData(prev => ({
        ...prev,
        watered: false,
        fertilized: false,
        lightHours: 6,
        notes: ''
      }));
      onSuccess?.();
    }
  };

  return (
    <div className="log-form-container">
      <h3 className="form-title">记录今日养护</h3>
      <form onSubmit={handleSubmit} className="log-form">
        <div className="form-date">
          <label>日期</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            className="form-input"
          />
        </div>

        <div className="form-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.watered}
              onChange={(e) => setFormData(prev => ({ ...prev, watered: e.target.checked }))}
            />
            <Droplets size={18} />
            <span>已浇水</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.fertilized}
              onChange={(e) => setFormData(prev => ({ ...prev, fertilized: e.target.checked }))}
            />
            <Leaf size={18} />
            <span>已施肥</span>
          </label>
        </div>

        <div className="form-slider">
          <label className="slider-label">
            <Sun size={18} />
            <span>光照时长: {formData.lightHours} 小时</span>
          </label>
          <input
            type="range"
            min="0"
            max="12"
            step="0.5"
            value={formData.lightHours}
            onChange={(e) => setFormData(prev => ({ ...prev, lightHours: parseFloat(e.target.value) }))}
            className="slider-input"
          />
          <div className="slider-marks">
            <span>0</span>
            <span>6</span>
            <span>12</span>
          </div>
        </div>

        <div className="form-textarea">
          <label className="textarea-label">
            <StickyNote size={18} />
            <span>备注</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="记录今天植物的状态..."
            className="form-textarea-input"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="submit-button"
        >
          {submitting ? '提交中...' : '保存记录'}
        </button>
      </form>

      {showToast && (
        <div className="toast success-toast">
          记录成功
        </div>
      )}
    </div>
  );
};

export default LogForm;
