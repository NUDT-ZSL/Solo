import { useCallback } from 'react'
import { useTravelStore } from '../store'
import { calculateRoute, estimateBudget } from '../utils/api'
import './RoutePanel.css'

export default function RoutePanel() {
  const {
    markers,
    route,
    budget,
    members,
    ui,
    setRoute,
    setBudget,
    setLoadingRoute,
    setLoadingBudget,
    toggleMobileRoute
  } = useTravelStore()

  const handleGenerateRoute = useCallback(async () => {
    if (markers.length < 2) return

    setLoadingRoute(true)
    try {
      const routeResult = await calculateRoute(markers)
      setRoute(routeResult)

      setLoadingBudget(true)
      try {
        const budgetResult = await estimateBudget(
          markers,
          routeResult.totalDistanceKm,
          routeResult.totalHours
        )
        setBudget(budgetResult)
      } catch {
        setBudget(null)
      } finally {
        setLoadingBudget(false)
      }
    } catch {
      setRoute(null)
      setBudget(null)
    } finally {
      setLoadingRoute(false)
    }
  }, [markers, setRoute, setBudget, setLoadingRoute, setLoadingBudget])

  const formatDuration = (hours: number): string => {
    const days = Math.floor(hours / 8)
    const remainingHours = Math.round((hours % 8) * 10) / 10
    if (days > 0 && remainingHours > 0) {
      return `${days}天 ${remainingHours}小时`
    }
    if (days > 0) {
      return `${days}天`
    }
    return `${remainingHours}小时`
  }

  const getMarkerById = (id: string) => markers.find((m) => m.id === id)
  const getMemberById = (id: string) => members.find((m) => m.id === id)

  return (
    <div className={`route-panel ${ui.mobileRouteOpen ? 'mobile-open' : ''}`}>
      <div className="route-panel-header">
        <h3>路线规划</h3>
        <button className="mobile-close-btn" onClick={toggleMobileRoute}>×</button>
      </div>

      <div className="route-panel-content">
        <div className="route-stats">
          <div className="stat-item">
            <span className="stat-label">标记点</span>
            <span className="stat-value">{markers.length}</span>
          </div>
          {route && (
            <>
              <div className="stat-item">
                <span className="stat-label">总距离</span>
                <span className="stat-value highlight">{route.totalDistanceKm} km</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">总时长</span>
                <span className="stat-value highlight">{formatDuration(route.totalHours)}</span>
              </div>
            </>
          )}
        </div>

        <button
          className="generate-route-btn"
          onClick={handleGenerateRoute}
          disabled={markers.length < 2 || ui.isLoadingRoute}
        >
          {ui.isLoadingRoute ? (
            <span className="btn-loading">计算中...</span>
          ) : (
            '生成路线'
          )}
        </button>

        {route && route.segments.length > 0 && (
          <div className="route-details">
            <h4>路线详情</h4>
            <div className="route-order">
              {route.order.map((markerId, idx) => {
                const marker = getMarkerById(markerId)
                const member = marker ? getMemberById(marker.memberId) : null
                return (
                  <div key={markerId} className="route-stop">
                    <div className="stop-number" style={{ backgroundColor: member?.color || '#2196F3' }}>
                      {idx + 1}
                    </div>
                    <div className="stop-info">
                      <span className="stop-name">{marker?.name || '未知'}</span>
                      <span className="stop-hours">停留 {marker?.stayHours || 0}h</span>
                    </div>
                    {idx < route.segments.length && (
                      <div className="segment-info">
                        <span className="segment-distance">
                          → {route.segments[idx].distanceKm} km
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {budget && (
          <div className="budget-details">
            <h4>预算估算</h4>
            <div className="budget-total">
              <span className="budget-total-label">总预算</span>
              <span className="budget-total-value">¥{budget.totalBudget.toLocaleString()}</span>
            </div>
            {members.length > 0 && (
              <div className="budget-per-person">
                <span className="budget-pp-label">人均费用</span>
                <span className="budget-pp-value">
                  ¥{Math.round(budget.totalBudget / members.length).toLocaleString()}
                </span>
              </div>
            )}
            <div className="budget-breakdown">
              <div className="breakdown-item">
                <div className="breakdown-bar-wrapper">
                  <div
                    className="breakdown-bar"
                    style={{
                      width: `${Math.min(100, (budget.breakdown.transportation / budget.totalBudget) * 100)}%`,
                      backgroundColor: '#2196F3'
                    }}
                  />
                </div>
                <div className="breakdown-info">
                  <span className="breakdown-label">交通</span>
                  <span className="breakdown-amount">¥{budget.breakdown.transportation.toLocaleString()}</span>
                </div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-bar-wrapper">
                  <div
                    className="breakdown-bar"
                    style={{
                      width: `${Math.min(100, (budget.breakdown.accommodation / budget.totalBudget) * 100)}%`,
                      backgroundColor: '#4CAF50'
                    }}
                  />
                </div>
                <div className="breakdown-info">
                  <span className="breakdown-label">住宿</span>
                  <span className="breakdown-amount">¥{budget.breakdown.accommodation.toLocaleString()}</span>
                </div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-bar-wrapper">
                  <div
                    className="breakdown-bar"
                    style={{
                      width: `${Math.min(100, (budget.breakdown.food / budget.totalBudget) * 100)}%`,
                      backgroundColor: '#FF9800'
                    }}
                  />
                </div>
                <div className="breakdown-info">
                  <span className="breakdown-label">餐饮</span>
                  <span className="breakdown-amount">¥{budget.breakdown.food.toLocaleString()}</span>
                </div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-bar-wrapper">
                  <div
                    className="breakdown-bar"
                    style={{
                      width: `${Math.min(100, (budget.breakdown.activities / budget.totalBudget) * 100)}%`,
                      backgroundColor: '#E91E63'
                    }}
                  />
                </div>
                <div className="breakdown-info">
                  <span className="breakdown-label">活动</span>
                  <span className="breakdown-amount">¥{budget.breakdown.activities.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {ui.isLoadingBudget && (
          <div className="budget-loading">
            <span className="loading-spinner" />
            计算预算中...
          </div>
        )}
      </div>
    </div>
  )
}
