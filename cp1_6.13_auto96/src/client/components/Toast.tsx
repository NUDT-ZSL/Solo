import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Toast() {
  const { toast, hideToast } = useStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast && !isVisible) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-3 bg-slate-700/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-600/50 min-w-[200px]">
        {icons[toast?.type || 'info']}
        <span className="text-sm font-medium text-white">{toast?.message}</span>
        <button
          onClick={hideToast}
          className="ml-2 p-0.5 rounded hover:bg-slate-600 transition-colors duration-200"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
