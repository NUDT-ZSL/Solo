import React from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  warning?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  title,
  message,
  warning,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <p className="confirm-text">{message}</p>
        {warning && <p className="confirm-warning">{warning}</p>}
        <div className="confirm-actions">
          <button className="btn-ghost" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={danger ? 'btn btn-danger' : 'btn'}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
