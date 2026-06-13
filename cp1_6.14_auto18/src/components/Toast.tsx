import { useAppStore } from '@/store/useAppStore';

const Toast = () => {
  const { toasts, removeToast } = useAppStore();

  const getToastStyle = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-green-500 text-white';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getToastStyle(toast.type)} px-4 py-3 rounded-lg shadow-lg min-w-[200px] toast-enter-active`}
          style={{
            opacity: 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-white hover:text-gray-200 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Toast;
