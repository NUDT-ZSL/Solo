import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { cn } from '@/lib/utils';

export default function Toast() {
  const toasts = useKnowledgeStore((s) => s.toasts);
  const removeToast = useKnowledgeStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium min-w-[200px]',
            t.exiting ? 'toast-exit' : 'toast-enter',
            t.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          )}
          onClick={() => removeToast(t.id)}
        >
          {t.type === 'success' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}
