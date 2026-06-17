import { useTravelStore, type MarkerPoint } from '../store'

export default function Sidebar() {
  const members = useTravelStore((s) => s.members)
  const markers = useTravelStore((s) => s.markers)
  const currentMemberId = useTravelStore((s) => s.currentMemberId)
  const expandedMemberId = useTravelStore((s) => s.ui.expandedMemberId)
  const setCurrentMember = useTravelStore((s) => s.setCurrentMember)
  const toggleMemberExpand = useTravelStore((s) => s.toggleMemberExpand)
  const removeMarker = useTravelStore((s) => s.removeMarker)

  const getMarkersByMember = (memberId: string): MarkerPoint[] => {
    return markers.filter((m) => m.memberId === memberId)
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
          旅行伙伴
        </h2>
        <p
          style={{
            fontSize: '12px',
            color: '#888'
          }}
        >
          点击头像切换当前成员
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {members.map((member) => {
            const memberMarkers = getMarkersByMember(member.id)
            const isExpanded = expandedMemberId === member.id
            const isCurrent = currentMemberId === member.id

            return (
              <div key={member.id}>
                <div
                  onClick={() => {
                    setCurrentMember(member.id)
                    toggleMemberExpand(member.id)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: isCurrent
                      ? `linear-gradient(135deg, ${member.color}15 0%, ${member.color}08 100%)`
                      : 'transparent',
                    border: isCurrent
                      ? `1px solid ${member.color}30`
                      : '1px solid transparent',
                    transition: 'all 0.2s ease-out'
                  }}
                  onMouseOver={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.background = '#F5F5F5'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: member.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 600,
                      flexShrink: 0,
                      boxShadow: isCurrent
                        ? `0 2px 8px ${member.color}40`
                        : '0 1px 3px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s'
                    }}
                  >
                    {member.name[0]}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '2px'
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '14px',
                          color: '#333'
                        }}
                      >
                        {member.name}
                      </span>
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: member.color,
                            color: 'white',
                            fontWeight: 500
                          }}
                        >
                          当前
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#888'
                      }}
                    >
                      {memberMarkers.length} 个标记点
                    </span>
                  </div>

                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isExpanded ? '#1A237E' : '#999'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transition: 'transform 0.3s ease-out',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      flexShrink: 0
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                {isExpanded && memberMarkers.length > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingLeft: '52px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    {memberMarkers.map((marker, idx) => (
                      <div
                        key={marker.id}
                        className="card-hover"
                        style={{
                          padding: '10px 12px',
                          background: '#FAFAFA',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: member.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 600,
                            flexShrink: 0,
                            marginTop: '1px'
                          }}
                        >
                          {idx + 1}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '13px',
                              color: '#333',
                              marginBottom: '2px'
                            }}
                          >
                            {marker.name}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#888',
                              marginBottom: '4px'
                            }}
                          >
                            停留 {marker.duration} 小时 · {marker.lat.toFixed(3)},{' '}
                            {marker.lng.toFixed(3)}
                          </div>
                          {marker.note && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#666',
                                lineHeight: 1.4,
                                background: 'white',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                marginBottom: '6px'
                              }}
                            >
                              {marker.note}
                            </div>
                          )}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <div
                              style={{
                                width: '32px',
                                height: '24px',
                                borderRadius: '4px',
                                background: marker.imageColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '9px',
                                fontWeight: 500
                              }}
                              title={marker.imageLabel}
                            >
                              {marker.imageLabel.slice(0, 2)}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeMarker(marker.id)
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '10px',
                                background: 'none',
                                border: '1px solid #ffcdd2',
                                color: '#E53935',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = '#FFEBEE'
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'none'
                              }}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && memberMarkers.length === 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingLeft: '52px',
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: '#AAA',
                      fontStyle: 'italic'
                    }}
                  >
                    暂无标记点，去地图上点击添加吧~
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
          flexShrink: 0
        }}
        className="card-hover"
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#1565C0',
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
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          旅行统计
        </div>
        <div
          style={{
            display: 'flex',
            gap: '12px'
          }}
        >
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.6)',
              padding: '10px',
              borderRadius: '6px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#1A237E',
                lineHeight: 1
              }}
            >
              {members.length}
            </div>
            <div
              style={{
                fontSize: '10px',
                color: '#5C6BC0',
                marginTop: '4px'
              }}
            >
              参与人
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.6)',
              padding: '10px',
              borderRadius: '6px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#1A237E',
                lineHeight: 1
              }}
            >
              {markers.length}
            </div>
            <div
              style={{
                fontSize: '10px',
                color: '#5C6BC0',
                marginTop: '4px'
              }}
            >
              标记点
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
