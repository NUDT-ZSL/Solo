import { useState } from 'react';
import type { Habit } from '../types';

interface CreateHabitModalProps {
  onClose: () => void;
  onSubmit: (habit: Omit<Habit, 'id' | 'createdAt'>) => Promise<void>;
}

const WEEKDAYS = [
  { label: '日', value: 0 },
  { label: '一', value: 1 },
  { label: '二', value: 2 },
  { label: '三', value: 3 },
  { label: '四', value: 4 },
  { label: '五', value: 5 },
  { label: '六', value: 6 }
];

export default function CreateHabitModal({ onClose, onSubmit }: CreateHabitModalProps) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [targetValue, setTargetValue] = useState(1);
  const [unit, setUnit] = useState('次');
  const [reminders, setReminders] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || targetValue <= 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        frequency,
        customDays: frequency === 'custom' ? customDays.sort() : undefined,
        targetValue,
        unit: unit.trim() || '次',
        reminders: reminders.filter(Boolean)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleWeekday = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addReminder = () => {
    if (reminders.length >= 3) return;
    setReminders([...reminders, '09:00']);
  };

  const updateReminder = (idx: number, val: string) => {
    setReminders((prev) => prev.map((r, i) => (i === idx ? val : r)));
  };

  const removeReminder = (idx: number) => {
    setReminders((prev) => prev.filter((_, i) => i !== idx));
  };

  const isFormValid =
    name.trim() &&
    targetValue > 0 &&
    (frequency !== 'custom' || customDays.length > 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2 className="modal-title">创建新习惯</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">习惯名称</label>
            <input
              className="form-input"
              type="text"
              placeholder="例如：每天喝水、每周跑步..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="form-label">执行频率</label>
            <div className="frequency-options">
              {(['daily', 'weekly', 'custom'] as const).map((f) => (
                <div
                  key={f}
                  className={`frequency-option ${frequency === f ? 'selected' : ''}`}
                  onClick={() => setFrequency(f)}
                >
                  {f === 'daily' ? '每天' : f === 'weekly' ? '每周' : '自定义'}
                </div>
              ))}
            </div>
          </div>

          {frequency === 'custom' && (
            <div className="form-group">
              <label className="form-label">选择日期</label>
              <div className="weekdays-picker">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`weekday-btn ${customDays.includes(d.value) ? 'selected' : ''}`}
                    onClick={() => toggleWeekday(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">目标值</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">单位</label>
              <input
                className="form-input"
                type="text"
                placeholder="次、杯、分钟..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                maxLength={10}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">提醒时间（最多3个）</label>
            <div className="reminders-inputs">
              {reminders.map((time, idx) => (
                <div key={idx} className="reminder-row">
                  <input
                    className="form-input"
                    type="time"
                    value={time}
                    onChange={(e) => updateReminder(idx, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="reminder-remove"
                    onClick={() => removeReminder(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {reminders.length < 3 && (
                <button type="button" className="add-reminder-btn" onClick={addReminder}>
                  + 添加提醒
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-submit" disabled={!isFormValid || submitting}>
            {submitting ? '创建中...' : '创建习惯'}
          </button>
        </div>
      </form>
    </div>
  );
}
