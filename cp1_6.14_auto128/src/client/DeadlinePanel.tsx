import React, { useState, useEffect } from 'react';
import http from './http';

interface DeadlineConfig {
  classId: string;
  assignmentId: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
}

const DeadlinePanel: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentDeadline, setCurrentDeadline] = useState<DeadlineConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [flashSuccess, setFlashSuccess] = useState(false);

  useEffect(() => {
    const fetchDeadline = async () => {
      try {
        const res = await http.get('/reviews/deadline', {
          params: { classId: 'class-001', assignmentId: 'assign-001' },
        });
        setCurrentDeadline(res.data);
        if (res.data.startDate) setStartDate(res.data.startDate);
        if (res.data.endDate) setEndDate(res.data.endDate);
      } catch (err) {
        console.error('Failed to load deadline:', err);
      }
    };
    fetchDeadline();
  }, []);

  const handleSave = async () => {
    if (!startDate || !endDate) return;
    setSaving(true);
    try {
      const res = await http.post('/reviews/deadline', {
        classId: 'class-001',
        assignmentId: 'assign-001',
        startDate,
        endDate,
      });
      setCurrentDeadline(res.data);

      setFlashSuccess(true);
      setTimeout(() => setFlashSuccess(false), 200);
    } catch (err) {
      console.error('Failed to save deadline:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="deadline-panel fade-in">
      <h3>评分截止时间</h3>
      <div className="deadline-form">
        <div className="deadline-field">
          <label>开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="deadline-field">
          <label>截止日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="date-input"
          />
        </div>
        <button
          className={`btn-primary ${saving || !startDate || !endDate ? 'btn-disabled' : ''} ${flashSuccess ? 'btn-flash-success' : ''}`}
          onClick={handleSave}
          disabled={saving || !startDate || !endDate}
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
      {currentDeadline && (
        <div className={`deadline-status ${currentDeadline.isLocked ? 'status-locked' : 'status-active'}`}>
          {currentDeadline.isLocked
            ? '🔒 评分已截止'
            : `✅ 评分进行中（截止：${currentDeadline.endDate}）`}
        </div>
      )}
    </div>
  );
};

export default DeadlinePanel;
