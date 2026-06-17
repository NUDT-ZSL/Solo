import { QRCodeSVG } from 'qrcode.react'
import { BorrowRecord } from '../types'

interface QRModalProps {
  open: boolean
  onClose: () => void
  record: BorrowRecord | null
}

export function QRModal({ open, onClose, record }: QRModalProps) {
  if (!open || !record) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeButton} onClick={onClose}>
          ×
        </button>
        <h2 style={styles.title}>扫码确认借用</h2>
        <div style={styles.qrContainer}>
          <QRCodeSVG value={record.id} size={256} />
        </div>
        <p style={styles.recordId}>记录ID: {record.id}</p>
      </div>
    </div>
  )
}

const styles = {
  modal: {
    position: 'relative' as const,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
  },
  closeButton: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '24px',
    lineHeight: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    border: 'none',
    padding: 0,
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold' as const,
    color: '#1e293b',
    marginTop: '16px',
  },
  qrContainer: {
    padding: '16px',
    backgroundColor: '#ffffff',
  },
  recordId: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '8px',
  },
}
