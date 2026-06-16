import React from 'react';

interface ConfirmBubbleProps {
  visible: boolean;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmBubble({
  visible,
  message = '确定移除？',
  onConfirm,
  onCancel,
}: ConfirmBubbleProps) {
  if (!visible) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-[8px] transition-all duration-200"
      style={{ backgroundColor: '#fee2e2' }}
    >
      <span className="text-sm text-red-700 font-medium">{message}</span>
      <button
        onClick={onConfirm}
        className="px-3 py-1 text-sm font-medium rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
      >
        是
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1 text-sm font-medium rounded-md bg-white text-gray-600 hover:bg-gray-50 transition-colors border border-gray-200"
      >
        否
      </button>
    </div>
  );
}
