import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { Toast } from '../types';

interface Props {
  toasts: Toast[];
}

export function ToastContainer({ toasts }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {toasts.map((t) => {
        const bg =
          t.type === 'success'
            ? '#16a34a'
            : t.type === 'error'
            ? '#dc2626'
            : '#2563eb';
        return (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              backgroundColor: bg,
              color: '#fff',
              borderRadius: 10,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              minWidth: 180,
              animation: 'fadeInUp 0.25s ease-out',
              fontSize: 14,
            }}
          >
            {t.type === 'success' && <CheckCircle2 size={18} />}
            {t.type === 'error' && <XCircle size={18} />}
            {t.type === 'loading' && (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            )}
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
