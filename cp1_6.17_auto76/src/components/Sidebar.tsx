import { useTravelStore, MEMBER_COLORS } from '../store'
import './Sidebar.css'

export default function Sidebar() {
  const {
    members,
    markers,
    ui,
    toggleMemberExpanded,
    removeMarker,
    toggleMobileSidebar
  } = useTravelStore()

  const getMemberMarkers = (memberId: string) =>
    markers.filter((m) => m.memberId === memberId)

  return (
    <div className={`sidebar ${ui.mobileSidebarOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <h3>参与人</h3>
        <button className="mobile-close-btn" onClick={toggleMobileSidebar}>×</button>
      </div>

      <div className="member-list">
        {members.map((member) => {
          const memberMarkers = getMemberMarkers(member.id)
          const isExpanded = ui.expandedMemberId === member.id

          return (
            <div key={member.id} className="member-section">
              <div
                className="member-header"
                onClick={() => toggleMemberExpanded(member.id)}
              >
                <div
                  className="member-avatar"
                  style={{ backgroundColor: member.color }}
                >
                  {member.avatar}
                </div>
                <div className="member-info">
                  <span className="member-name">{member.name}</span>
                  <span className="marker-count">{memberMarkers.length} 个标记</span>
                </div>
                <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                  ▸
                </span>
              </div>

              {isExpanded && memberMarkers.length > 0 && (
                <div className="marker-list">
                  {memberMarkers.map((marker) => (
                    <div key={marker.id} className="marker-item">
                      <div
                        className="marker-color-dot"
                        style={{ backgroundColor: member.color }}
                      />
                      <div className="marker-item-info">
                        <span className="marker-item-name">{marker.name}</span>
                        <span className="marker-item-hours">
                          停留 {marker.stayHours}h
                        </span>
                      </div>
                      <div
                        className="marker-image-tag"
                        style={{ backgroundColor: marker.imageColor }}
                      >
                        {marker.imageLabel}
                      </div>
                      <button
                        className="marker-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeMarker(marker.id)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="sidebar-footer">
        <div className="stats-card">
          <div className="stats-item">
            <span className="stats-number">{members.length}</span>
            <span className="stats-label">参与人</span>
          </div>
          <div className="stats-divider" />
          <div className="stats-item">
            <span className="stats-number">{markers.length}</span>
            <span className="stats-label">标记点</span>
          </div>
        </div>
      </div>
    </div>
  )
}
