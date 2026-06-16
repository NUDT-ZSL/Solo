import React, { useState, useEffect } from 'react'
import type { Activity, Registration } from '../types'
import { formatDate, calculateCheckInStats, filterRegistrationsByStatus, getCategoryColor, getAvailableSpots } from '../business/activityManager'

interface AdminDashboardProps {
  onLogout: () => void
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loadingRegistrations, setLoadingRegistrations] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'checkedIn' | 'notCheckedIn'>('all')

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/activities')
      const data = await response.json()
      setActivities(data)
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRegistrations = async (activityId: string) => {
    setLoadingRegistrations(true)
    try {
      const response = await fetch(`/api/admin/activities/${activityId}/registrations`)
      const data = await response.json()
      setRegistrations(data)
    } catch (error) {
      console.error('Failed to fetch registrations:', error)
    } finally {
      setLoadingRegistrations(false)
    }
  }

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity)
    setStatusFilter('all')
    fetchRegistrations(activity.id)
  }

  const handleBackToActivities = () => {
    setSelectedActivity(null)
    setRegistrations([])
  }

  const filteredRegistrations = filterRegistrationsByStatus(registrations, statusFilter)
  const stats = selectedActivity ? calculateCheckInStats(registrations) : null

  const getAvatarColor = (name: string): string => {
    const colors = ['#3498DB', '#27AE60', '#E74C3C', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E22']
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  if (loading) {
    return (
      <div style={styles.loadingState}>
        <div style={styles.loadingSpinner}></div>
        <p>加载中...</p>
      </div>
    )
  }

  if (selectedActivity) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backButton} onClick={handleBackToActivities}>
              <span style={styles.backArrow}>←</span>
              <span>返回活动列表</span>
            </button>
          </div>
          <button style={styles.logoutButton} onClick={onLogout}>
            退出登录
          </button>
        </div>

        <div style={styles.detailHeader}>
          <div>
            <h2 style={styles.activityTitle}>{selectedActivity.name}</h2>
            <p style={styles.activityMeta}>
              {formatDate(selectedActivity.date)} {selectedActivity.time} · {selectedActivity.location}
            </p>
          </div>
          {stats && (
            <div style={styles.statsContainer}>
              <div style={styles.statCard}>
                <span style={styles.statValue}>{stats.totalRegistered}</span>
                <span style={styles.statLabel}>总报名人数</span>
              </div>
              <div style={{ ...styles.statCard, borderLeft: '3px solid #27AE60' }}>
                <span style={{ ...styles.statValue, color: '#27AE60' }}>{stats.totalCheckedIn}</span>
                <span style={styles.statLabel}>已签到</span>
              </div>
              <div style={{ ...styles.statCard, borderLeft: '3px solid #E74C3C' }}>
                <span style={{ ...styles.statValue, color: '#E74C3C' }}>{stats.notCheckedInCount}</span>
                <span style={styles.statLabel}>未签到</span>
              </div>
              <div style={{ ...styles.statCard, borderLeft: '3px solid #3498DB' }}>
                <span style={{ ...styles.statValue, color: '#3498DB' }}>{stats.checkInRate}%</span>
                <span style={styles.statLabel}>签到率</span>
              </div>
            </div>
          )}
        </div>

        <div style={styles.filterContainer}>
          <span style={styles.filterLabel}>签到状态：</span>
          <div style={styles.filterButtons}>
            <button
              style={{
                ...styles.filterButton,
                ...(statusFilter === 'all' ? styles.filterButtonActive : {})
              }}
              onClick={() => setStatusFilter('all')}
            >
              全部 ({registrations.length})
            </button>
            <button
              style={{
                ...styles.filterButton,
                ...(statusFilter === 'checkedIn' ? styles.filterButtonCheckedIn : {})
              }}
              onClick={() => setStatusFilter('checkedIn')}
            >
              已签到 ({stats?.totalCheckedIn || 0})
            </button>
            <button
              style={{
                ...styles.filterButton,
                ...(statusFilter === 'notCheckedIn' ? styles.filterButtonNotCheckedIn : {})
              }}
              onClick={() => setStatusFilter('notCheckedIn')}
            >
              未签到 ({stats?.notCheckedInCount || 0})
            </button>
          </div>
        </div>

        <div style={styles.tableContainer}>
          {loadingRegistrations ? (
            <div style={styles.loadingState}>
              <div style={styles.loadingSpinner}></div>
              <p>加载报名名单...</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableHeaderCell}>参与者</th>
                  <th style={styles.tableHeaderCell}>邮箱</th>
                  <th style={styles.tableHeaderCell}>手机号</th>
                  <th style={styles.tableHeaderCell}>报名时间</th>
                  <th style={styles.tableHeaderCell}>签到状态</th>
                  <th style={styles.tableHeaderCell}>签到时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.length > 0 ? (
                  filteredRegistrations.map((reg, index) => (
                    <tr key={reg.id} style={styles.tableRow} className="slide-up">
                      <td style={styles.tableCell}>
                        <div style={styles.participantInfo}>
                          <div style={{
                            ...styles.avatar,
                            backgroundColor: getAvatarColor(reg.name)
                          }}>
                            {reg.name.charAt(0)}
                          </div>
                          <span style={styles.participantName}>{reg.name}</span>
                        </div>
                      </td>
                      <td style={styles.tableCell}>{reg.email}</td>
                      <td style={styles.tableCell}>{reg.phone}</td>
                      <td style={styles.tableCell}>
                        {new Date(reg.registeredAt).toLocaleString('zh-CN')}
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{
                          ...styles.statusBadge,
                          ...(reg.checkedIn ? styles.statusCheckedIn : styles.statusNotCheckedIn)
                        }}>
                          <span style={styles.statusDot}></span>
                          {reg.checkedIn ? '已签到' : '未签到'}
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        {reg.checkedInAt
                          ? new Date(reg.checkedInAt).toLocaleString('zh-CN')
                          : '-'
                        }
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={styles.emptyTableCell}>
                      <div style={styles.emptyState}>
                        <p>暂无符合条件的报名记录</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>活动管理后台</h2>
        <button style={styles.logoutButton} onClick={onLogout}>
          退出登录
        </button>
      </div>

      <p style={styles.subtitle}>共 {activities.length} 个活动</p>

      <div style={styles.activitiesGrid}>
        {activities.map(activity => {
          const availableSpots = getAvailableSpots(activity)
          const categoryColor = getCategoryColor(activity.category)
          return (
            <div
              key={activity.id}
              style={styles.activityCard}
              onClick={() => handleActivityClick(activity)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}
            >
              <div style={styles.activityCardHeader}>
                <span style={{
                  ...styles.categoryBadge,
                  backgroundColor: categoryColor,
                  color: '#FFFFFF'
                }}>
                  {activity.category}
                </span>
                <span style={{
                  ...styles.spotsBadge,
                  color: availableSpots > 0 ? '#27AE60' : '#E74C3C'
                }}>
                  剩余 {availableSpots} 名
                </span>
              </div>
              <h3 style={styles.cardTitle}>{activity.name}</h3>
              <div style={styles.cardMeta}>
                <div style={styles.metaItem}>
                  <span style={styles.metaIcon}>📅</span>
                  <span>{formatDate(activity.date)}</span>
                </div>
                <div style={styles.metaItem}>
                  <span style={styles.metaIcon}>📍</span>
                  <span>{activity.location}</span>
                </div>
              </div>
              <div style={styles.cardFooter}>
                <div style={styles.progressContainer}>
                  <div style={styles.progressLabel}>
                    <span>报名进度</span>
                    <span>{activity.registeredCount}/{activity.capacity}</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${(activity.registeredCount / activity.capacity) * 100}%`,
                        backgroundColor: (activity.registeredCount / activity.capacity) >= 0.9 ? '#E74C3C' : '#3498DB'
                      }}
                    ></div>
                  </div>
                </div>
                <button style={styles.viewDetailsButton}>
                  查看详情 →
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  container: {
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#2C3E50',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#7F8C8D',
    marginBottom: '24px',
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#E74C3C',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#2C3E50',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s ease-out',
  },
  backArrow: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  activitiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
  },
  activityCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  categoryBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  spotsBadge: {
    fontSize: '12px',
    fontWeight: 600,
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2C3E50',
    marginBottom: '16px',
    lineHeight: 1.4,
    minHeight: '50px',
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '20px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#7F8C8D',
  },
  metaIcon: {
    fontSize: '14px',
  },
  cardFooter: {
    borderTop: '1px solid #F0F0F0',
    paddingTop: '16px',
  },
  progressContainer: {
    marginBottom: '16px',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#7F8C8D',
    marginBottom: '8px',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#F0F0F0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease-out',
  },
  viewDetailsButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#EBF5FB',
    color: '#3498DB',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
  },
  detailHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  activityTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#2C3E50',
    marginBottom: '8px',
  },
  activityMeta: {
    fontSize: '14px',
    color: '#7F8C8D',
    margin: 0,
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginTop: '20px',
  },
  statCard: {
    padding: '16px',
    backgroundColor: '#F8F9FA',
    borderRadius: '12px',
    borderLeft: '3px solid #3498DB',
  },
  statValue: {
    display: 'block',
    fontSize: '28px',
    fontWeight: 700,
    color: '#2C3E50',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#7F8C8D',
  },
  filterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#2C3E50',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  filterButton: {
    padding: '8px 16px',
    border: '2px solid #E0E0E0',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#7F8C8D',
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
  },
  filterButtonActive: {
    borderColor: '#3498DB',
    backgroundColor: '#EBF5FB',
    color: '#3498DB',
  },
  filterButtonCheckedIn: {
    borderColor: '#27AE60',
    backgroundColor: '#EAFAF1',
    color: '#27AE60',
  },
  filterButtonNotCheckedIn: {
    borderColor: '#E74C3C',
    backgroundColor: '#FDF2F2',
    color: '#E74C3C',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  tableHeader: {
    backgroundColor: '#F8F9FA',
  },
  tableHeaderCell: {
    padding: '16px',
    textAlign: 'left' as const,
    fontSize: '12px',
    fontWeight: 600,
    color: '#7F8C8D',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: '2px solid #F0F0F0',
  },
  tableRow: {
    borderBottom: '1px solid #F0F0F0',
    transition: 'all 0.3s ease-out',
    animationDelay: '0.05s',
  },
  tableCell: {
    padding: '16px',
    fontSize: '14px',
    color: '#2C3E50',
  },
  participantInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
  },
  participantName: {
    fontWeight: 500,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusCheckedIn: {
    backgroundColor: '#EAFAF1',
    color: '#27AE60',
  },
  statusNotCheckedIn: {
    backgroundColor: '#FDF2F2',
    color: '#E74C3C',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'currentColor',
  },
  emptyTableCell: {
    padding: '60px 20px',
    textAlign: 'center' as const,
  },
  emptyState: {
    textAlign: 'center' as const,
    color: '#95A5A6',
  },
  loadingState: {
    textAlign: 'center' as const,
    padding: '80px 20px',
    color: '#7F8C8D',
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #E0E0E0',
    borderTopColor: '#3498DB',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'rotate 1s linear infinite',
  },
}

export default AdminDashboard
