import React, { useState, useCallback } from 'react';
import { User, Skill } from '../types';
import { apiService } from '../services/apiService';
import './RequestModal.css';

interface SkillWithUser extends Skill {
  user: User;
}

interface RequestModalProps {
  targetSkill: SkillWithUser;
  currentUser: User;
  onClose: () => void;
  onSent: () => void;
}

const RequestModal: React.FC<RequestModalProps> = ({
  targetSkill,
  currentUser,
  onClose,
  onSent,
}) => {
  const [selectedMySkillId, setSelectedMySkillId] = useState(
    currentUser.skills[0]?.id || ''
  );
  const [hours, setHours] = useState(2);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const selectedMySkill = currentUser.skills.find(s => s.id === selectedMySkillId);

  const handleSubmit = useCallback(async () => {
    if (!selectedMySkillId) return;
    
    setSending(true);
    try {
      await apiService.createRequest({
        fromUserId: currentUser.id,
        toUserId: targetSkill.user.id,
        fromSkillId: selectedMySkillId,
        toSkillId: targetSkill.id,
        proposedHours: hours,
        message: message || `想和你交换${targetSkill.name}技能，我可以教你${selectedMySkill?.name}。`,
      });
      onSent();
    } catch (error) {
      console.error('Failed to send request:', error);
    } finally {
      setSending(false);
    }
  }, [currentUser.id, targetSkill, selectedMySkillId, hours, message, selectedMySkill, onSent]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal request-modal">
        <div className="modal-header">
          <h3>发起兑换请求</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="exchange-preview">
            <div className="exchange-side">
              <img src={currentUser.avatar} alt="" className="exchange-avatar" />
              <div className="exchange-info">
                <span className="exchange-name">{currentUser.nickname}</span>
                <span className="exchange-skill-name">
                  {selectedMySkill?.name || '请选择技能'}
                </span>
              </div>
            </div>
            
            <div className="exchange-arrow-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <path d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span className="hours-badge-large">{hours}小时</span>
            </div>

            <div className="exchange-side right">
              <img src={targetSkill.user.avatar} alt="" className="exchange-avatar" />
              <div className="exchange-info">
                <span className="exchange-name">{targetSkill.user.nickname}</span>
                <span className="exchange-skill-name">{targetSkill.name}</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>选择我要提供的技能</label>
            <select
              value={selectedMySkillId}
              onChange={(e) => setSelectedMySkillId(e.target.value)}
              className="form-select"
            >
              {currentUser.skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name} ({skill.level})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>提议教学时长：{hours}小时</label>
            <div className="hours-selector">
              {[1, 2, 3, 4].map((h) => (
                <button
                  key={h}
                  className={`hour-btn ${hours === h ? 'active' : ''}`}
                  onClick={() => setHours(h)}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>留言（选填）</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="想对Ta说点什么..."
              className="form-textarea"
              rows={3}
              maxLength={200}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={onClose}>取消</button>
          <button
            className="btn btn-submit"
            onClick={handleSubmit}
            disabled={sending || !selectedMySkillId}
          >
            {sending ? '发送中...' : '发送请求'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestModal;
