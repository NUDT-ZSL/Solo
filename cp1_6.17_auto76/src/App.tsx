import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import RoutePanel from './components/RoutePanel'
import { useTravelStore } from './store'
import './App.css'

export default function App() {
  const { markers, route, ui, toggleMobileSidebar, toggleMobileRoute } =
    useTravelStore()

  const totalStayHours = markers.reduce((sum, m) => sum + m.stayHours, 0)
  const hasRoute = route !== null

  return (
    <div className="app">
      <div className="mobile-nav">
        <button className="mobile-nav-btn" onClick={toggleMobileSidebar}>
          <span className="nav-icon">👥</span>
          <span className="nav-label">成员</span>
        </button>
        <div className="mobile-nav-title">行迹地图</div>
        <button className="mobile-nav-btn" onClick={toggleMobileRoute}>
          <span className="nav-icon">🗺️</span>
          <span className="nav-label">路线</span>
        </button>
      </div>

      <div className="app-layout">
        <aside className="sidebar-panel">
          <Sidebar />
        </aside>

        <main className="map-panel">
          <MapView />

          <div className="map-action-bar">
            <div className="action-summary">
              <span className="summary-item">
                📍 {markers.length} 个标记
              </span>
              <span className="summary-item">
                ⏱️ {totalStayHours.toFixed(1)}h 停留
              </span>
              {hasRoute && (
                <span className="summary-item highlight">
                  🛤️ {route.totalDistanceKm} km
                </span>
              )}
            </div>
            <div className="action-buttons">
              <button className="action-btn hint-btn" title="点击地图任意位置添加标记">
                💡 点击地图添加标记
              </button>
            </div>
          </div>
        </main>

        <aside className="route-panel-wrapper">
          <RoutePanel />
        </aside>
      </div>

      {ui.mobileSidebarOpen && (
        <div className="mobile-overlay" onClick={toggleMobileSidebar} />
      )}
      {ui.mobileRouteOpen && (
        <div className="mobile-overlay" onClick={toggleMobileRoute} />
      )}
    </div>
  )
}
