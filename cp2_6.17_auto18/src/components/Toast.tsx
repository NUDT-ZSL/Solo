import { useExhibitionStore } from '@/store';

export default function Toast() {
  const { toast, hideToast } = useExhibitionStore();

  if (!toast) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-[toastIn_0.3s_ease-out]">
      <div
        className="w-[200px] h-[50px] bg-[#22c55e] rounded-lg flex items-center justify-center text-white font-medium shadow-lg"
        style={{
          animation: 'toastOut 0.5s ease-out 1.5s forwards',
        }}
      >
        {toast.message}
      </div>
      <style>{`
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        @keyframes toastOut {
          from {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
        }
      `}</style>
    </div>
  );
}
