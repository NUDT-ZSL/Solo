interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-forest-900/50"
        onClick={onCancel}
      />
      <div className="relative glass-panel rounded-xl p-6 w-full max-w-sm mx-4 bg-white animate-fade-in">
        <h3 className="text-lg font-bold text-forest-800 mb-2">{title}</h3>
        <p className="text-sm text-forest-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button className="btn-ghost" onClick={onCancel}>
            取消
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200 active:scale-95"
            onClick={onConfirm}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
