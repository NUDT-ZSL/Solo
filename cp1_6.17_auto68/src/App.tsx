import { useState, useEffect } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import RoutePanel from './components/RoutePanel'
import { useTravelStore } from './store'

export default function App() {
  const markers = useTravelStore((s) => s.markers)
  const members = useTravelStore((s) => s.members)
  const [isMobile, setIsMobile] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState<'sidebar' | 'map' | 'route'>('map')

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#F5F5F5',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #1A237E 0%, #3F51B5 100%)',
            color: 'white',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            flexShrink: 0
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>行迹地图</span>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ flex: 1, overflow: 'hidden', padding: '12px' }}>
            {activeMobileTab === 'map' && <MapView />}
            {activeMobileTab === 'sidebar' && <Sidebar />}
            {activeMobileTab === 'route' && <RoutePanel />}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            background: 'white',
            borderTop: '1px solid #E0E0E0',
            flexShrink: 0
          }}
        >
          {[
            { id: 'sidebar', label: '伙伴', icon: '👥' },
            { id: 'map', label: '地图', icon: '🗺️' },
            { id: 'route', label: '路线', icon: '🧭' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMobileTab(tab.id as typeof activeMobileTab)}
              style={{
                flex: 1,
                padding: '12px 8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: activeMobileTab === tab.id ? '#1A237E' : '#888',
                fontWeight: activeMobileTab === tab.id ? 600 : 400,
                transition: 'color 0.2s',
                borderTop:
                  activeMobileTab === tab.id ? '2px solid #1A237E' : '2px solid transparent',
                marginTop: '-2px'
              }}
            >
              <span style={{ fontSize: '20px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background:
          'linear-gradient(135deg, #1A237E 0%, #283593 50%, #3F51B5 100%)',
        padding: '16px',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          gap: '16px'
        }}
      >
        <div style={{ width: '15%', height: '100%', minWidth: '240px' }}>
          <Sidebar />
        </div>

        <div
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}
            className="card-hover"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1A237E 0%, #3F51B5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '18px',
                    color: '#1A237E'
                  }}
                >
                  行迹地图
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#888'
                  }}
                >
                  虚拟旅行日志与路线规划协作平台
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#4CAF50',
                    boxShadow: '0 0 8px #4CAF5080'
                  }}
                />
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {members.length} 位成员在线
                </span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#888',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <span>
                  📍 {markers.length} 标记点
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              gap: '16px',
              overflow: 'hidden',
              minHeight: 0
            }}
          >
            <div
              style={{
                flex: '0 0 70%',
                height: '100%',
                minWidth: 0
              }}
            >
              <MapView />
            </div>
            <div
              style={{
                flex: '0 0 calc(30% - 16px)',
                height: '100%',
                minWidth: '260px'
              }}
            >
              <RoutePanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
