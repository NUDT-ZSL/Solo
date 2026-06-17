import { useState, useEffect } from 'react';
import '../styles/components.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (applicant: string) => void;
  title?: string;
  itemName: string;
  defaultApplicant?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '确认申请领取',
  itemName,
  defaultApplicant = '张三',
}: ConfirmModalProps) {
  const [applicant, setApplicant] = useState(defaultApplicant);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setApplicant(defaultApplicant);
    }
  }, [isOpen, defaultApplicant]);

  const handleConfirm = () => {
    if (applicant.trim()) {
      onConfirm(applicant.trim());
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={`confirm-modal-overlay ${isVisible ? 'visible' : 'hidden'}`}
      onClick={handleOverlayClick}
    >
      <div className={`confirm-modal ${isVisible ? 'visible' : 'hidden'}`}>
        <h2 className="confirm-modal-title">{title}</h2>
        
        <div className="confirm-modal-item-info">
          <span className="confirm-modal-item-label">物品名称：</span>
          <span className="confirm-modal-item-name">{itemName}</span>
        </div>

        <div className="confirm-modal-input-group">
          <label className="confirm-modal-label" htmlFor="applicant">申请人：</label>
          <input
            id="applicant"
            type="text"
            value={applicant}
            onChange={(e) => setApplicant(e.target.value)}
            className="confirm-modal-input"
            placeholder="请输入申请人姓名"
          />
        </div>

        <div className="confirm-modal-button-group">
          <button className="confirm-modal-cancel-button" onClick={onClose}>
            取消
          </button>
          <button className="confirm-modal-confirm-button" onClick={handleConfirm}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
