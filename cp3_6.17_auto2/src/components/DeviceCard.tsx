import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Device, User } from '../types'
import { useBorrow } from '../hooks/useBorrow'

interface DeviceCardProps {
  device: Device
  user: User | null
  onBorrowSuccess?: () => void
}

export function DeviceCard({ device, user, onBorrowSuccess }: DeviceCardProps) {
  const navigate = useNavigate()
  const { borrow, loading: borrowLoading } = useBorrow()
  const [showConfirm, setShowConfirm] = useState(false)

  const getStatusConfig = (status: Device['status']) => {
    switch (status) {
      case 'available':
        return { text: '空闲', color: '#22c55e' }
      case 'borrowed':
        return { text: '被借', color: '#eab308' }
      case 'maintenance':
        return { text: '维修', color: '#ef4444' }
    }
  }

  const statusConfig = getStatusConfig(device.status)
  const isAvailable = device.status === 'available'
  const hasEnoughCredit = user ? user.creditScore >= device.minCreditScore : true
  const canBorrow = isAvailable && hasEnoughCredit && user !== null

  const handleCardClick = () => {
    navigate(`/device/${device.id}`)
  }

  const handleBorrowClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (canBorrow && !borrowLoading) {
      setShowConfirm(true)
    }
  }

  const handleConfirmBorrow = async () => {
    if (!user) return
    try {
      await borrow(device.id, user.id)
      setShowConfirm(false)
      onBorrowSuccess?.()
    } catch {
    }
  }

  return (
    <>
      <div style={styles.card} className="device-card" onClick={handleCardClick}>
        <div style={styles.imageContainer}>
          <img src={device.imageUrl} alt={device.name} style={styles.image} />
        </div>
        <div style={styles.content}>
          <div style={styles.header}>
            <h3 style={styles.name}>{device.name}</h3>
            <span style={{ ...styles.statusBadge, backgroundColor: statusConfig.color }}>
              {statusConfig.text}
            </span>
          </div>
          <div style={styles.typeTag}>{device.type}</div>
          <div style={styles.creditRow}>
            <span style={styles.creditText}>信用分要求: {device.minCreditScore}</span>
          </div>
          <button
            style={{
              ...styles.borrowButton,
              backgroundColor: canBorrow ? '#3b82f6' : '#94a3b8',
              cursor: canBorrow && !borrowLoading ? 'pointer' : 'not-allowed',
              opacity: borrowLoading ? 0.8 : 1,
            }}
            disabled={!canBorrow || borrowLoading}
            onClick={handleBorrowClick}
          >
            {borrowLoading ? (
              <span style={styles.loadingSpinner}></span>
            ) : null}
            {!isAvailable ? '不可借用' : !hasEnoughCredit ? '信用分不足' : '立即借用'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div style={styles.modalOverlay} onClick={(e) => { e.stopPropagation(); setShowConfirm(false) }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>确认借用</h3>
            <p style={styles.modalDeviceName}>{device.name}</p>
            <p style={styles.modalStatus}>
              当前状态：
              <span style={{ color: statusConfig.color, fontWeight: 600 }}>
                {statusConfig.text}
              </span>
            </p>
            <p style={styles.modalTip}>借用后请在7天内按时归还，保持良好信用记录。</p>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowConfirm(false)}
                disabled={borrowLoading}
              >
                取消
              </button>
              <button
                style={{
                  ...styles.confirmButton,
                  opacity: borrowLoading ? 0.8 : 1,
                }}
                onClick={handleConfirmBorrow}
                disabled={borrowLoading}
              >
                {borrowLoading && <span style={styles.buttonSpinner}></span>}
                {borrowLoading ? '借用中...' : '确认借用'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const styles = {
  card: {
    width: '240px',
    height: '320px',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  imageContainer: {
    width: '100%',
    height: '140px',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  content: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    flex: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: '15px',
    fontWeight: 'bold' as const,
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
    marginRight: '8px',
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '500' as const,
    flexShrink: 0,
  },
  typeTag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    fontSize: '12px',
    alignSelf: 'flex-start' as const,
  },
  creditRow: {
    marginTop: '4px',
  },
  creditText: {
    fontSize: '12px',
    color: '#64748b',
  },
  borrowButton: {
    marginTop: 'auto',
    width: '100%',
    padding: '10px 0',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600' as const,
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    border: 'none',
    outline: 'none',
  },
  loadingSpinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    width: '360px',
    maxWidth: '90%',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
  },
  modalTitle: {
    margin: 0,
    marginBottom: '16px',
    fontSize: '18px',
    fontWeight: 700,
    color: '#1e293b',
  },
  modalDeviceName: {
    margin: 0,
    marginBottom: '8px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
  },
  modalStatus: {
    margin: 0,
    marginBottom: '16px',
    fontSize: '14px',
    color: '#64748b',
  },
  modalTip: {
    margin: 0,
    marginBottom: '24px',
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '8px 20px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  confirmButton: {
    padding: '8px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  buttonSpinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
}
