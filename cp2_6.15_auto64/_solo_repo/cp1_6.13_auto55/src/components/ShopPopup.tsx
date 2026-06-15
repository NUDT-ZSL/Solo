import { ShopInfo } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  '餐饮': '#f97316',
  '零售': '#3b82f6',
  '娱乐': '#a855f7',
  '服务': '#22c55e',
};

export default function ShopPopup({
  shop,
  onClose,
}: {
  shop: ShopInfo;
  onClose: () => void;
}) {
  const categoryColor = CATEGORY_COLORS[shop.category] || '#6b7280';

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 280,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 50,
        padding: 20,
        animation: 'popupIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#1f2937',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {shop.name}
        </h3>
      </div>

      <div style={{ marginBottom: 12 }}>
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            background: '#e5e7eb',
            color: '#4b5563',
            borderLeft: `3px solid ${categoryColor}`,
          }}
        >
          {shop.category}
        </span>
      </div>

      {shop.discount && (
        <div
          style={{
            marginBottom: 16,
            padding: '8px 12px',
            borderLeft: '4px solid #ef4444',
            background: 'rgba(239,68,68,0.06)',
            borderRadius: '0 8px 8px 0',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#ef4444' }}>
            {shop.discount}
          </span>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 32px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#ffffff',
            color: '#374151',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
