import { useState, useEffect, useCallback } from 'react'
import DeviceCard, { type Device } from './components/DeviceCard'
import ReservationForm from './components/ReservationForm'
import { useReservations, type Reservation } from './hooks/useReservations'
import http from './http'

const USER_ID = 'user-001'
const USER_NAME = '张同学'

type ToastType = { message: string; type: 'success' | 'error' } | null

export default function App() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [toast, setToast] = useState<ToastType>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const {
    myReservations,
    pendingReservations,
    fetchMyReservations,
    fetchPendingReservations,
    createReservation,
    cancelReservation,
    approveReservation,
    rejectReservation
  } = useReservations(USER_ID)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchDevices = useCallback(async () => {
    try {
      const res = await http.get('/devices')
      if (res.data.success) {
        setDevices(res.data.data)
      }
    } catch {
      console.error('Failed to fetch devices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
    const params = new URLSearchParams(window.location.search)
    setIsAdmin(params.get('admin') === 'true')
  }, [fetchDevices])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleReserve = (device: Device) => {
    setSelectedDevice(device)
    if (isMobile) setDrawerOpen(true)
  }

  const handleSubmitReservation = async (data: {
    deviceId: string
    userId: string
    userName: string
    date: string
    timeSlot: string
    note: string
  }) => {
    try {
      const result = await createReservation(data)
      if (result.success) {
        showToast('预约提交成功！', 'success')
        setSelectedDevice(null)
        fetchMyReservations()
        fetchDevices()
      } else {
        showToast(result.message || '预约失败', 'error')
      }
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string }
      if (error.status === 409) {
        showToast('该设备在该时间段已被预约', 'error')
      } else {
        showToast(error.message || '预约失败', 'error')
      }
    }
  }

  const handleCancelReservation = async (id: string) => {
    try {
      await cancelReservation(id)
      showToast('预约已取消', 'success')
    } catch {
      showToast('取消失败', 'error')
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await approveReservation(id)
      showToast('已通过', 'success')
    } catch {
      showToast('操作失败', 'error')
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectReservation(id)
      showToast('已拒绝', 'success')
    } catch {
      showToast('操作失败', 'error')
    }
  }

  const statusLabel = (status: Reservation['status']) => {
    const map: Record<Reservation['status'], { text: string; cls: string }> = {
      pending: { text: '待审批', cls: 'res-status-pending' },
      approved: { text: '已通过', cls: 'res-status-approved' },
      rejected: { text: '已拒绝', cls: 'res-status-rejected' }
    }
    return map[status]
  }

  const rightPanel = (
    <div className="right-panel-inner">
      {selectedDevice ? (
        <ReservationForm
          device={selectedDevice}
          userId={USER_ID}
          userName={USER_NAME}
          onSubmit={handleSubmitReservation}
          onClose={() => setSelectedDevice(null)}
        />
      ) : (
        <div className="no-device-hint">
          <span className="hint-icon">📋</span>
          <p>点击设备卡片上的「立即预约」开始</p>
        </div>
      )}

      <div className="my-reservations">
        <h3 className="section-title">我的预约</h3>
        {myReservations.length === 0 ? (
          <p className="empty-hint">暂无预约记录</p>
        ) : (
          <ul className="reservation-list">
            {myReservations.map(r => {
              const s = statusLabel(r.status)
              return (
                <li key={r.id} className="reservation-item">
                  <div className="res-info">
                    <span className="res-device-name">{r.deviceName}</span>
                    <span className="res-detail">{r.date} {r.timeSlot}</span>
                    <span className={`res-status-tag ${s.cls}`}>{s.text}</span>
                  </div>
                  <button
                    className="btn-cancel-res"
                    onClick={() => handleCancelReservation(r.id)}
                  >
                    取消
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {isAdmin && (
        <div className="admin-pending">
          <h3 className="section-title">待审批预约</h3>
          {pendingReservations.length === 0 ? (
            <p className="empty-hint">暂无待审批预约</p>
          ) : (
            <ul className="reservation-list">
              {pendingReservations.map(r => (
                <li key={r.id} className="reservation-item admin-item">
                  <div className="res-info">
                    <span className="res-device-name">{r.deviceName}</span>
                    <span className="res-detail">{r.userName} · {r.date} {r.timeSlot}</span>
                  </div>
                  <div className="admin-actions">
                    <button className="btn-approve" onClick={() => handleApprove(r.id)}>通过</button>
                    <button className="btn-reject" onClick={() => handleReject(r.id)}>拒绝</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="app">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <header className="navbar">
        <div className="navbar-brand">🔬 InvenTree</div>
        <div className="navbar-links">
          {isAdmin ? (
            <span className="admin-badge">管理员模式</span>
          ) : (
            <a
              className="admin-link"
              href={`${window.location.pathname}?admin=true`}
            >
              管理员入口
            </a>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="left-panel">
          {loading ? (
            <div className="device-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-img" />
                  <div className="skeleton-text" />
                  <div className="skeleton-text short" />
                  <div className="skeleton-btn" />
                </div>
              ))}
            </div>
          ) : (
            <div className="device-grid">
              {devices.map(device => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  isAdmin={isAdmin}
                  onReserve={handleReserve}
                  onDeviceUpdated={fetchDevices}
                />
              ))}
            </div>
          )}
        </div>

        {!isMobile && (
          <div className="divider" />
        )}

        {!isMobile ? (
          <aside className="right-panel">
            {rightPanel}
          </aside>
        ) : (
          <>
            <button
              className="fab-btn"
              onClick={() => setDrawerOpen(!drawerOpen)}
            >
              {drawerOpen ? '✕' : '+'}
            </button>
            <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
            <div className={`bottom-drawer ${drawerOpen ? 'open' : ''}`}>
              <div className="drawer-handle" />
              {rightPanel}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
