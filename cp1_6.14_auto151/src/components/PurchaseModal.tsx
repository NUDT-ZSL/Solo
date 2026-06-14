interface PurchaseModalProps {
  open: boolean
  title: string
  price: number
  onConfirm: () => void
  onCancel: () => void
}

export default function PurchaseModal({ open, title, price, onConfirm, onCancel }: PurchaseModalProps) {
  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: 400, background: '#1e293b', borderRadius: 16,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)', padding: 32,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 20, color: '#fff', marginBottom: 16 }}>确认购买</h3>
        <p style={{ fontSize: 15, color: '#d1d5db', marginBottom: 8 }}>
          作品名称：<span style={{ color: '#f59e0b' }}>{title}</span>
        </p>
        <p style={{ fontSize: 18, color: '#f59e0b', fontWeight: 700, marginBottom: 24 }}>
          价格：¥{price.toLocaleString()}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: 44, borderRadius: 8, border: '1px solid #4b5563',
              background: 'transparent', color: '#9ca3af', fontSize: 15, cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, height: 44, borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #eab308)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              transition: 'filter 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)' }}
          >
            确认购买
          </button>
        </div>
      </div>
    </div>
  )
}
