import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Candidate } from '../types';

interface InterviewModalProps {
  candidate: Candidate;
  onClose: () => void;
  onSaved: () => void;
}

const InterviewModal: React.FC<InterviewModalProps> = ({ candidate, onClose, onSaved }) => {
  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [saving, setSaving] = useState(false);

  const timeSlots: string[] = [];
  for (let h = 9; h <= 18; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00-${h.toString().padStart(2, '0')}:30`);
    if (h < 18) {
      timeSlots.push(`${h.toString().padStart(2, '0')}:30-${(h + 1).toString().padStart(2, '0')}:00`);
    }
  }

  const handleSave = async () => {
    if (!date || !selectedSlot) {
      alert('请选择面试日期和时间段');
      return;
    }
    setSaving(true);
    try {
      const { candidatesApi } = await import('../utils/api');
      const newInterview = {
        id: uuidv4(),
        date,
        timeSlot: selectedSlot,
        createdAt: new Date().toISOString(),
      };
      await candidatesApi.update(candidate.id, {
        interviews: [...candidate.interviews, newInterview],
      });
      onSaved();
    } catch (err) {
      console.error('Save interview failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>安排面试 - {candidate.name}</h2>
        <div className="modal-field">
          <label>面试日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="modal-field">
          <label>时间段（30分钟间隔）</label>
          <div className="time-slots">
            {timeSlots.map((slot) => (
              <button
                key={slot}
                className={`time-slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
                onClick={() => setSelectedSlot(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
        {candidate.interviews.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#636e72' }}>已安排的面试</label>
            <div className="interview-timeline" style={{ marginTop: '8px' }}>
              {candidate.interviews.map((intv) => (
                <div key={intv.id} className="interview-item">
                  <strong>{intv.date}</strong> {intv.timeSlot}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '确认安排'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewModal;
