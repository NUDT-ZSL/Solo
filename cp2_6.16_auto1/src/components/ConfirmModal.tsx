import { useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    await onConfirm();
    setIsConfirming(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', animation: 'fade-in 0.2s ease-out' }}
    >
      <div
        className="bg-white p-6 mx-4"
        style={{
          width: '320px',
          borderRadius: '16px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
        }}
      >
        <h3 className="text-lg font-bold mb-2" style={{ color: '#5d4037' }}>
          {title}
        </h3>
        <p className="text-sm mb-6" style={{ color: '#6d4c41' }}>
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: '#9e9e9e' }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="px-5 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: '#f44336',
              animation: isConfirming ? 'btn-shrink 0.1s ease-out' : 'none',
            }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
