import React, { useState, useEffect } from 'react'
import type { Activity } from '../types'
import { formatDate, getCategoryColor, getCategoryBgColor, getAvailableSpots, isActivityFull } from '../business/activityManager'
import RegistrationForm from './RegistrationForm'

interface ActivityDetailProps {
  activityId: string
  onBack: () => void
  onRegisterSuccess: (activityId: string) => void
  isRegistered: boolean
}

const ActivityDetail: React.FC<ActivityDetailProps> = ({
  activityId,
  onBack,
  onRegisterSuccess,
  isRegistered
}) => {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [hasRegistered, setHasRegistered] = useState(isRegistered)

  useEffect(() => {
    setHasRegistered(isRegistered)
  }, [isRegistered])

  useEffect(() => {
    fetchActivity()
  }, [activityId])

  const fetchActivity = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/activities/${activityId}`)
      const data = await response.json()
      setActivity(data)
    } catch (error) {
      console.error('Failed to fetch activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterClick = () => {
    if (!hasRegistered && activity && !isActivityFull(activity)) {
      setShowRegistrationForm(true)
    }
  }

  const handleRegisterSuccess = () => {
    setHasRegistered(true)
    setShowRegistrationForm(false)
    onRegisterSuccess(activityId)
    fetchActivity()
  }

  const handleCloseForm = () => {
    setShowRegistrationForm(false)
  }

  const SkeletonLoader = () => (
    <div style={styles.detailContainer} className="fade-in">
      <button style={styles.backButton}>
        <span>←</span>
        <span>返回列表</span>
      </button>
      <div style={styles.detailCard}>
        <div style={styles.skeletonImageArea} className="skeleton"></div>
        <div style={{ ...styles.detailHeader, background: '#E0E0E0', padding: '24px 32px' }}>
          <div style={{ ...styles.skeletonTag, width: '80px' }} className="skeleton"></div>
          <div style={{ width: '120px', height: '24px', borderRadius: '8px' }} className="skeleton"></div>
        </div>
        <div style={styles.detailBody}>
          <div style={{ ...styles.skeletonLine, width: '60%', height: '32px', marginBottom: '24px' }} className="skeleton"></div>
          <div style={styles.infoGrid}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={styles.infoItem}>
                <div style={{ ...styles.skeletonLine, width: '60px', height: '12px', marginBottom: '8px' }} className="skeleton"></div>
                <div style={{ ...styles.skeletonLine, width: '150px', height: '20px', marginBottom: '6px' }} className="skeleton"></div>
                <div style={{ ...styles.skeletonLine, width: '120px', height: '20px' }} className="skeleton"></div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '32px' }}>
            <div style={{ ...styles.skeletonLine, width: '100px', height: '18px', marginBottom: '12px' }} className="skeleton"></div>
            <div style={{ ...styles.skeletonLine, width: '100%', height: '16px', marginBottom: '8px' }} className="skeleton"></div>
            <div style={{ ...styles.skeletonLine, width: '90%', height: '16px', marginBottom: '8px' }} className="skeleton"></div>
            <div style={{ ...styles.skeletonLine, width: '95%', height: '16px', marginBottom: '8px' }} className="skeleton"></div>
            <div style={{ ...styles.skeletonLine, width: '70%', height: '16px' }} className="skeleton"></div>
          </div>
          <div style={{ marginTop: '32px' }}>
            <div style={{ ...styles.skeletonLine, width: '100px', height: '18px', marginBottom: '12px' }} className="skeleton"></div>
            <div style={{ ...styles.skeletonLine, width: '100%', height: '16px', marginBottom: '8px' }} className="skeleton"></div>
            <div style={{ ...styles.skeletonLine, width: '85%', height: '16px' }} className="skeleton"></div>
          </div>
          <div style={styles.skeletonActionSection}>
            <div style={{ ...styles.skeletonLine, width: '100%', height: '52px', borderRadius: '12px' }} className="skeleton"></div>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return <SkeletonLoader />
  }

  if (!activity) {
    return (
      <div style={styles.emptyState}>
        <p>活动不存在</p>
        <button style={styles.backToHome} onClick={onBack}>返回列表</button>
      </div>
    )
  }

  const availableSpots = getAvailableSpots(activity)
  const full = isActivityFull(activity)
  const categoryColor = getCategoryColor(activity.category)
  const categoryBgColor = getCategoryBgColor(activity.category)

  return (
    <div style={styles.detailContainer} className="fade-in">
      <button style={styles.backButton} onClick={onBack}>
        <span style={styles.backArrow}>←</span>
        <span>返回列表</span>
      </button>

      <div style={styles.detailCard}>
        <div style={{ ...styles.detailHeader, background: categoryBgColor }}>
          <span style={{
            ...styles.categoryTag,
            background: categoryColor,
            color: '#FFFFFF'
          }}>
            {activity.category}
          </span>
          <div style={styles.spotsBadge}>
            <span style={styles.spotsBadgeIcon}>👥</span>
            <span style={{
              ...styles.spotsBadgeText,
              color: full ? '#E74C3C' : '#27AE60'
            }}>
              {full ? '名额已满' : `剩余 ${availableSpots} 个名额`}
            </span>
          </div>
        </div>

        <div style={styles.detailBody}>
          <h1 style={styles.activityTitle}>{activity.name}</h1>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>活动时间</span>
              <div style={styles.infoValue}>
                <span style={styles.infoIcon}>📅</span>
                <span>{formatDate(activity.date)}</span>
              </div>
              <div style={styles.infoValue}>
                <span style={styles.infoIcon}>⏰</span>
                <span>{activity.time}</span>
              </div>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>活动地点</span>
              <div style={styles.infoValue}>
                <span style={styles.infoIcon}>📍</span>
                <span>{activity.location}</span>
              </div>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>报名人数</span>
              <div style={styles.infoValue}>
                <span style={styles.infoIcon}>👥</span>
                <span>{activity.registeredCount} / {activity.capacity} 人</span>
              </div>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>举办方</span>
              <div style={styles.infoValue}>
                <span style={styles.infoIcon}>🏢</span>
                <span>{activity.organizer}</span>
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>活动介绍</h2>
            <p style={styles.descriptionText}>{activity.description}</p>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>举办方介绍</h2>
            <p style={styles.descriptionText}>{activity.organizerInfo}</p>
          </div>

          <div style={styles.actionSection}>
            <button
              style={{
                ...styles.registerButton,
                ...(hasRegistered ? styles.registeredButton : {}),
                ...(full ? styles.fullButton : {})
              }}
              onClick={handleRegisterClick}
              disabled={hasRegistered || full}
            >
              {full ? '名额已满' : hasRegistered ? '已报名' : '立即报名'}
            </button>
          </div>
        </div>
      </div>

      {showRegistrationForm && (
        <div style={styles.modalOverlay} onClick={handleCloseForm}>
          <div style={styles.formContainer} className="scale-in" onClick={e => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={handleCloseForm}>
              ✕
            </button>
            <RegistrationForm
              activityId={activityId}
              activityName={activity.name}
              onSuccess={handleRegisterSuccess}
              onClose={handleCloseForm}
            />
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  detailContainer: {
    maxWidth: '900px',
    margin: '0 auto',
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
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s ease-out',
  },
  backArrow: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  },
  detailHeader: {
    padding: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTag: {
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
  },
  spotsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  spotsBadgeIcon: {
    fontSize: '14px',
  },
  spotsBadgeText: {
    fontSize: '13px',
    fontWeight: 600,
  },
  detailBody: {
    padding: '32px',
  },
  activityTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#2C3E50',
    marginBottom: '32px',
    lineHeight: 1.3,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#7F8C8D',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  infoValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    color: '#2C3E50',
  },
  infoIcon: {
    fontSize: '16px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2C3E50',
    marginBottom: '16px',
  },
  descriptionText: {
    fontSize: '15px',
    color: '#5D6D7E',
    lineHeight: 1.8,
  },
  actionSection: {
    marginTop: '40px',
    paddingTop: '24px',
    borderTop: '1px solid #F0F0F0',
  },
  registerButton: {
    width: '100%',
    padding: '16px 32px',
    backgroundColor: '#3498DB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
  },
  registeredButton: {
    backgroundColor: '#95A5A6',
    cursor: 'not-allowed',
  },
  fullButton: {
    backgroundColor: '#95A5A6',
    cursor: 'not-allowed',
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
    padding: '20px',
  },
  formContainer: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '500px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  closeButton: {
    position: 'absolute' as const,
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '18px',
    color: '#95A5A6',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'all 0.3s ease-out',
    zIndex: 10,
  },
  skeletonLine: {
    height: '16px',
    borderRadius: '4px',
  },
  skeletonTag: {
    height: '32px',
    borderRadius: '20px',
  },
  skeletonImageArea: {
    width: '100%',
    height: '200px',
    backgroundColor: '#E0E0E0',
  },
  skeletonActionSection: {
    marginTop: '40px',
    paddingTop: '24px',
    borderTop: '1px solid #E0E0E0',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
  },
  backToHome: {
    marginTop: '20px',
    padding: '10px 24px',
    backgroundColor: '#3498DB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
}

export default ActivityDetail
