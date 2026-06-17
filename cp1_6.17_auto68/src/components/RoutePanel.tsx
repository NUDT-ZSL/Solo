import { useState, useEffect } from 'react'
import { useTravelStore } from '../store'
import { generateRoute, estimateBudget, type BudgetResponse } from '../utils/api'

export default function RoutePanel() {
  const markers = useTravelStore((s) => s.markers)
  const route = useTravelStore((s) => s.route)
  const members = useTravelStore((s) => s.members)
  const setRoute = useTravelStore((s) => s.setRoute)
  const isGeneratingRoute = useTravelStore((s) => s.ui.isGeneratingRoute)
  const routeError = useTravelStore((s) => s.ui.routeError)
  const setGeneratingRoute = useTravelStore((s) => s.setGeneratingRoute)
  const setRouteError = useTravelStore((s) => s.setRouteError)

  const [budget, setBudget] = useState<BudgetResponse | null>(null)

  const handleGenerateRoute = async () => {
    if (markers.length < 2) {
      setRouteError('至少需要2个标记点才能生成路线')
      return
    }

    setGeneratingRoute(true)
    setRouteError(null)
    setBudget(null)

    try {
      const routeData = await generateRoute(markers)
      setRoute(routeData)

      try {
        const budgetData = await estimateBudget(
          routeData.totalDistance,
          routeData.totalHours,
          markers.length
        )
        setBudget(budgetData)
      } catch (e) {
        // budget estimation is optional
      }
    } catch (e: any) {
      setRouteError(e.message || '路线生成失败，请稍后重试')
    } finally {
      setGeneratingRoute(false)
    }
  }

  useEffect(() => {
    if (route && !budget) {
      estimateBudget(route.totalDistance, route.totalHours, markers.length)
        .then(setBudget)
        .catch(() => {})
    }
  }, [route])

  const getMemberById = (memberId: string) => members.find((m) => m.id === memberId)
  const getMarkerById = (id: string) => markers.find((m) => m.id === id)

  const formatDuration = (totalHours: number) => {
    const days = Math.floor(totalHours / 24)
    const hours = Math.round(totalHours % 24)
    if (days > 0) {
      return `${days} 天 ${hours} 小时`
    }
    return `${hours} 小时`
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      className="card-hover"
    >
      <div style={{ marginBottom: '20px' }}>
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#1A237E',
            marginBottom: '4px'
          }}
        >
          路线规划
        </h2>
        <p
          style={{
            fontSize: '12px',
            color: '#888'
          }}
        >
          智能计算最优旅行路线
        </p>
      </div>

      <button
        onClick={handleGenerateRoute}
        disabled={isGeneratingRoute || markers.length < 2}
        style={{
          width: '100%',
          padding: '14px',
          marginBottom: '16px',
          background:
            markers.length >= 2
              ? 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)'
              : '#E0E0E0',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: markers.length >= 2 && !isGeneratingRoute ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: markers.length >= 2 ? '0 2px 8px rgba(33,150,243,0.3)' : 'none'
        }}
        onMouseOver={(e) => {
          if (markers.length >= 2 && !isGeneratingRoute) {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(33,150,243,0.4)'
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow =
            markers.length >= 2 ? '0 2px 8px rgba(33,150,243,0.3)' : 'none'
        }}
      >
        {isGeneratingRoute ? (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <circle cx="12" cy="12" r="10" opacity="0.3"></circle>
              <path d="M12 2a10 10 0 0 1 10 10"></path>
            </svg>
            生成中...
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
            生成路线
          </>
        )}
      </button>

      {routeError && (
        <div
          style={{
            padding: '10px 12px',
            background: '#FFEBEE',
            border: '1px solid #FFCDD2',
            color: '#E53935',
            fontSize: '12px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}
        >
          {routeError}
        </div>
      )}

      {markers.length < 2 && !route && (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            background: '#FAFAFA',
            borderRadius: '8px',
            marginBottom: '16px'
          }}
        >
          <div
            style={{
              fontSize: '32px',
              marginBottom: '8px',
              opacity: 0.5
            }}
          >
            📍
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#888'
            }}
          >
            请至少在地图上添加 2 个标记点
          </div>
        </div>
      )}

      {route && (
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '16px'
            }}
          >
            <div
              className="card-hover"
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)'
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#2E7D32',
                  fontWeight: 600,
                  marginBottom: '4px'
                }}
              >
                总距离
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#1B5E20'
                }}
              >
                {route.totalDistance.toFixed(1)}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    marginLeft: '2px'
                  }}
                >
                  km
                </span>
              </div>
            </div>

            <div
              className="card-hover"
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)'
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#E65100',
                  fontWeight: 600,
                  marginBottom: '4px'
                }}
              >
                总时长
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#BF360C'
                }}
              >
                {formatDuration(route.totalHours)}
              </div>
            </div>
          </div>

          {budget && (
            <div
              className="card-hover"
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)',
                marginBottom: '16px'
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#6A1B9A',
                  fontWeight: 600,
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                预算估算
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#8E24AA',
                  marginBottom: '8px'
                }}
              >
                <span>交通</span>
                <span style={{ fontWeight: 600 }}>¥{budget.transportCost.toFixed(0)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#8E24AA',
                  marginBottom: '8px'
                }}
              >
                <span>住宿</span>
                <span style={{ fontWeight: 600 }}>¥{budget.accommodationCost.toFixed(0)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#8E24AA',
                  marginBottom: '10px'
                }}
              >
                <span>餐饮</span>
                <span style={{ fontWeight: 600 }}>¥{budget.foodCost.toFixed(0)}</span>
              </div>
              <div
                style={{
                  height: '1px',
                  background: '#CE93D8',
                  marginBottom: '10px'
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    color: '#6A1B9A',
                    fontWeight: 600
                  }}
                >
                  总计
                </span>
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#4A148C'
                  }}
                >
                  ¥{budget.totalBudget.toFixed(0)}
                </span>
              </div>
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1A237E',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              访问顺序
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {route.order.map((markerId, idx) => {
                const marker = getMarkerById(markerId)
                const member = marker ? getMemberById(marker.memberId) : null
                if (!marker) return null

                return (
                  <div
                    key={markerId}
                    className="card-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      background: '#FAFAFA',
                      borderRadius: '8px',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: idx === 0 ? '50%' : idx === route.order.length - 1 ? '4px' : '50%',
                        background:
                          idx === 0
                            ? '#4CAF50'
                            : idx === route.order.length - 1
                            ? '#F44336'
                            : '#2196F3',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {idx + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '2px'
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: '#333'
                          }}
                        >
                          {marker.name}
                        </span>
                        {member && (
                          <div
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              background: member.color
                            }}
                            title={member.name}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#888',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span>停留 {marker.duration}h</span>
                        {idx < route.distances.length && (
                          <span style={{ color: '#2196F3' }}>
                            → 下一站 {route.distances[idx].toFixed(0)}km
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
