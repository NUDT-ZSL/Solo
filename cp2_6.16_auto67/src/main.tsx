import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import MapView from './map'
import CarePanel from './panel'
import type { User } from './types'
import { getCurrentUser } from './data'

function App() {
  const [currentView, setCurrentView] = useState<'map' | 'panel'>('map')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    getCurrentUser().then(setUser)
  }, [])

  const handleEnterPanel = () => setCurrentView('panel')
  const handleBackToMap = () => setCurrentView('map')

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          height: '60px',
          background: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          color: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentView === 'panel' && (
            <button
              onClick={handleBackToMap}
              style={backButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseDown={(e) => createRipple(e)}
            >
              ← 返回地图
            </button>
          )}
          <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '0.5px' }}>
            🌿 城市绿植认养平台
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.2)',
                padding: '6px 14px',
                borderRadius: '20px',
              }}
            >
              <span>👤 {user.name}</span>
              <span
                style={{
                  background: '#d8f3dc',
                  color: '#2d6a4f',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                {user.points} 积分
              </span>
            </div>
          )}
          {currentView === 'map' && user && user.adoptedPlants.length > 0 && (
            <button
              onClick={handleEnterPanel}
              style={navButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseDown={(e) => createRipple(e)}
            >
              我的养护
            </button>
          )}
        </div>
      </header>
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {currentView === 'map' ? (
          <MapView onAdopted={handleEnterPanel} />
        ) : (
            <CarePanel user={user} onUserUpdate={setUser} />
          )}
      </main>
    </div>
  )
}

const backButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.2)',
  color: 'white',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
}

const navButtonStyle: React.CSSProperties = {
  background: '#d8f3dc',
  color: '#2d6a4f',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
}

function createRipple(event: React.MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget
  const circle = document.createElement('span')
  const diameter = Math.max(button.clientWidth, button.clientHeight)
  const radius = diameter / 2
  const rect = button.getBoundingClientRect()
  circle.style.width = circle.style.height = `${diameter}px`
  circle.style.left = `${event.clientX - rect.left - radius}px`
  circle.style.top = `${event.clientY - rect.top - radius}px`
  circle.style.background = 'rgba(255,255,255,0.4)'
  circle.style.position = 'absolute'
  circle.style.borderRadius = '50%'
  circle.style.transform = 'scale(0)'
  circle.style.animation = 'ripple 0.6s ease-out'
  circle.style.pointerEvents = 'none'
  circle.style.zIndex = '1'
  button.appendChild(circle)
  setTimeout(() => circle.remove(), 600)
}

const style = document.createElement('style')
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }
  @keyframes bounceFlash {
    0% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
    100% { transform: translateY(0); }
  }
  @keyframes flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .bounce-flash {
    animation: bounceFlash 0.5s ease, flash 0.5s ease;
  }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
