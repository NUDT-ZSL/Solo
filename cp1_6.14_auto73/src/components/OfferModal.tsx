import React, { useState } from 'react';
import type { Candidate } from '../types';

interface OfferModalProps {
  candidate: Candidate;
  onClose: () => void;
  onSaved: () => void;
}

const OfferModal: React.FC<OfferModalProps> = ({ candidate, onClose, onSaved }) => {
  const [salary, setSalary] = useState(candidate.offer?.salary || '');
  const [onboardDate, setOnboardDate] = useState(candidate.offer?.onboardDate || '');
  const [notes, setNotes] = useState(candidate.offer?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!salary || !onboardDate) {
      alert('请填写Offer金额和入职日期');
      return;
    }
    setSaving(true);
    try {
      const { candidatesApi } = await import('../utils/api');
      await candidatesApi.update(candidate.id, {
        offer: { salary, onboardDate, notes },
      });
      onSaved();
    } catch (err) {
      console.error('Save offer failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>录入Offer - {candidate.name}</h2>
        <div className="modal-field">
          <label>Offer金额</label>
          <input
            type="text"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="例如：22K"
          />
        </div>
        <div className="modal-field">
          <label>入职日期</label>
          <input
            type="date"
            value={onboardDate}
            onChange={(e) => setOnboardDate(e.target.value)}
          />
        </div>
        <div className="modal-field">
          <label>备注</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="备注信息..."
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>
        {onboardDate && (() => {
          const diff = new Date(onboardDate).getTime() - new Date().getTime();
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          if (days > 0 && days <= 7) {
            return (
              <div style={{
                padding: '10px 14px',
                background: '#fff5f5',
                borderRadius: '8px',
                color: '#e74c3c',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '16px',
              }}>
                ⚠️ 距入职仅剩 {days} 天
              </div>
            );
          }
          return null;
        })()}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存Offer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfferModal;
