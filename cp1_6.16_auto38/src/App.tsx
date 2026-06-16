import React, { useState, useCallback, useEffect } from 'react'
import ActivityList from './components/ActivityList'
import ActivityDetail from './components/ActivityDetail'
import CheckInPage from './components/CheckInPage'
import AdminDashboard from './components/AdminDashboard'
import AdminLogin from './components/AdminLogin'
import type { Page, AppState, Activity, Registration } from './types'

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentPage: 'list',
    selectedActivityId: null,
    isLoggedIn: false,
    userInfo: null
  })

  const [registeredActivities, setRegisteredActivities] = useState<Set<string>>(new Set())
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')

  const navigateTo = useCallback((page: Page, activityId?: string) => {
    setState(prev => ({
      ...prev,
      currentPage: page,
      selectedActivityId: activityId || prev.selectedActivityId
    }))
  }, [])

  const handleActivityClick = useCallback((activityId: string) => {
    navigateTo('detail', activityId)
  }, [navigateTo])

  const handleBack = useCallback(() => {
    if (state.currentPage === 'detail') {
      navigateTo('list')
    } else if (state.currentPage === 'admin' && !state.isLoggedIn) {
      navigateTo('list')
    } else if (state.currentPage === 'admin-login') {
      navigateTo('list')
    }
  }, [state.currentPage, state.isLoggedIn, navigateTo])

  const handleRegisterSuccess = useCallback((activityId: string) => {
    setRegisteredActivities(prev => new Set(prev).add(activityId))
    setModalMessage('报名成功！我们已收到您的报名信息，活动当天期待您的光临。')
    setShowRegistrationModal(true)
  }, [])

  const handleAdminLogin = useCallback(() => {
    setState(prev => ({ ...prev, isLoggedIn: true }))
    navigateTo('admin')
  }, [navigateTo])

  const handleAdminLogout = useCallback(() => {
    setState(prev => ({ ...prev, isLoggedIn: false }))
    navigateTo('list')
  }, [navigateTo])

  const closeModal = useCallback(() => {
    setShowRegistrationModal(false)
    setModalMessage('')
  }, [])

  const renderHeader = () => (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.logoContainer} onClick={() => navigateTo('list')}>
          <span style={styles.logoIcon}>🎪</span>
          <h1 style={styles.logoText}>社区活动中心</h1>
        </div>
        <nav style={styles.nav}>
          <button
            style={{
              ...styles.navButton,
              ...(state.currentPage === 'list' ? styles.navButtonActive : {})
            }}
            onClick={() => navigateTo('list')}
          >
            活动列表
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(state.currentPage === 'checkin' ? styles.navButtonActive : {})
            }}
            onClick={() => navigateTo('checkin')}
          >
            签到
          </button>
          {state.isLoggedIn ? (
            <button
              style={{
                ...styles.navButton,
                ...(state.currentPage === 'admin' ? styles.navButtonActive : {}),
                ...styles.adminButton
              }}
              onClick={() => navigateTo('admin')}
            >
              管理后台
            </button>
          ) : (
            <button
              style={styles.adminLink}
              onClick={() => navigateTo('admin-login')}
            >
              🔐
            </button>
          )}
        </nav>
      </div>
    </header>
  )

  const renderPage = () => {
    switch (state.currentPage) {
      case 'list':
        return (
          <ActivityList
            onActivityClick={handleActivityClick}
            registeredActivities={registeredActivities}
          />
        )
      case 'detail':
        return (
          <ActivityDetail
            activityId={state.selectedActivityId!}
            onBack={handleBack}
            onRegisterSuccess={handleRegisterSuccess}
            isRegistered={state.selectedActivityId ? registeredActivities.has(state.selectedActivityId) : false}
          />
        )
      case 'checkin':
        return <CheckInPage />
      case 'admin-login':
        return <AdminLogin onLogin={handleAdminLogin} onBack={handleBack} />
      case 'admin':
        return state.isLoggedIn ? (
          <AdminDashboard onLogout={handleAdminLogout} />
        ) : (
          <AdminLogin onLogin={handleAdminLogin} onBack={handleBack} />
        )
      default:
        return <ActivityList onActivityClick={handleActivityClick} registeredActivities={registeredActivities} />
    }
  }

  return (
    <div style={styles.app}>
      {renderHeader()}
      <main style={styles.main} className="fade-in">
        {renderPage()}
      </main>

      {showRegistrationModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} className="scale-in" onClick={e => e.stopPropagation()}>
            <div style={styles.successIcon}>
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none" style={{ animation: 'rotate 0.5s ease-out' }}>
                <circle cx="30" cy="30" r="28" fill="#27AE60" />
                <path
                  d="M18 30L26 38L42 22"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 style={styles.modalTitle}>报名成功！</h2>
            <p style={styles.modalMessage}>{modalMessage}</p>
            <button style={styles.modalButton} onClick={closeModal}>
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  logoIcon: {
    fontSize: '28px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#2C3E50',
    margin: 0,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  navButton: {
    padding: '8px 20px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#2C3E50',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease-out',
  },
  navButtonActive: {
    backgroundColor: '#EBF5FB',
    color: '#3498DB',
  },
  adminButton: {
    backgroundColor: '#2C3E50',
    color: '#FFFFFF',
  },
  adminLink: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    fontSize: '18px',
    borderRadius: '8px',
    transition: 'all 0.3s ease-out',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
    minHeight: 'calc(100vh - 64px)',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '40px 32px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center' as const,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  successIcon: {
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#2C3E50',
    marginBottom: '12px',
  },
  modalMessage: {
    fontSize: '14px',
    color: '#7F8C8D',
    marginBottom: '28px',
    lineHeight: 1.6,
  },
  modalButton: {
    padding: '12px 40px',
    backgroundColor: '#3498DB',
    color: '#FFFFFF',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
    transition: 'all 0.3s ease-out',
  },
}

export default App
