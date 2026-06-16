import React, { useEffect, useState } from 'react'
import ControlPanel from './components/ControlPanel'
import PreviewScene from './components/PreviewScene'
import { WalletProvider } from './context/WalletContext'

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 900)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div style={styles.appContainer}>
      <div style={isMobile ? styles.mobileLayout : styles.desktopLayout}>
        <ControlPanel />
        <PreviewScene />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  desktopLayout: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    padding: '16px',
    boxSizing: 'border-box',
    gap: '16px',
  },
  mobileLayout: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: '12px',
    boxSizing: 'border-box',
    gap: '12px',
  },
}

const AppWithProvider: React.FC = () => (
  <WalletProvider>
    <App />
  </WalletProvider>
)

export default AppWithProvider
