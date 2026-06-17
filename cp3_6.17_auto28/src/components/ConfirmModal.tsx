interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  loading = false
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300"
      style={{ background: '#00000080' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl p-6 shadow-2xl relative"
        style={{ maxWidth: '420px', width: '90%' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-800 mb-3">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 h-10 rounded-lg text-sm font-medium transition-all duration-300 border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 h-10 rounded-lg text-sm font-medium text-white transition-all duration-300 hover:brightness-110 disabled:opacity-50 active:scale-[0.98]"
            style={{ background: '#1e293b' }}
          >
            {loading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
