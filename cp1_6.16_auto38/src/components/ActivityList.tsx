import React, { useState, useEffect, useMemo } from 'react'
import type { Activity, Pagination } from '../types'
import { formatDate, getCategoryColor, getCategoryBgColor, getAvailableSpots, isActivityFull } from '../business/activityManager'

interface ActivityListProps {
  onActivityClick: (activityId: string) => void
  registeredActivities: Set<string>
}

const ActivityList: React.FC<ActivityListProps> = ({ onActivityClick, registeredActivities }) => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  const categories = [
    { value: 'all', label: '全部类别' },
    { value: '讲座', label: '讲座', color: '#3498DB', bgColor: '#EBF5FB' },
    { value: '工作坊', label: '工作坊', color: '#9B59B6', bgColor: '#F5EEF8' },
    { value: '户外活动', label: '户外活动', color: '#27AE60', bgColor: '#EAFAF1' }
  ]

  useEffect(() => {
    fetchActivities()
  }, [pagination.page, category, startDate, endDate])

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString()
      })
      if (category !== 'all') params.append('category', category)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/activities?${params}`)
      const data = await response.json()
      setActivities(data.activities)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (value: string) => {
    setCategory(value)
    setPagination(prev => ({ ...prev, page: 1 }))
    setShowCategoryDropdown(false)
  }

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value)
    } else {
      setEndDate(value)
    }
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const SkeletonCard = () => (
    <div style={styles.card} className="skeleton-card">
      <div style={{ ...styles.cardHeader, background: '#E0E0E0' }}>
        <div style={{ ...styles.categoryTag, background: '#E0E0E0' }}></div>
      </div>
      <div style={styles.cardBody}>
        <div style={{ ...styles.skeletonLine, width: '80%', marginBottom: '12px' }} className="skeleton"></div>
        <div style={{ ...styles.skeletonLine, width: '60%', marginBottom: '8px' }} className="skeleton"></div>
        <div style={{ ...styles.skeletonLine, width: '40%', marginBottom: '16px' }} className="skeleton"></div>
        <div style={{ ...styles.skeletonLine, width: '100%', height: '20px' }} className="skeleton"></div>
      </div>
    </div>
  )

  const ActivityCard = ({ activity }: { activity: Activity }) => {
    const availableSpots = getAvailableSpots(activity)
    const full = isActivityFull(activity)
    const isRegistered = registeredActivities.has(activity.id)
    const categoryColor = getCategoryColor(activity.category)
    const categoryBgColor = getCategoryBgColor(activity.category)

    return (
      <div
        style={styles.card}
        className="activity-card"
        onClick={() => onActivityClick(activity.id)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.12)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
      >
        <div style={{ ...styles.cardHeader, background: categoryBgColor }}>
          <span style={{
            ...styles.categoryTag,
            background: categoryColor,
            color: '#FFFFFF'
          }}>
            {activity.category}
          </span>
          {isRegistered && (
            <span style={styles.registeredBadge}>已报名</span>
          )}
        </div>
        <div style={styles.cardBody}>
          <h3 style={styles.activityTitle}>{activity.name}</h3>
          <div style={styles.activityMeta}>
            <div style={styles.metaItem}>
              <span style={styles.metaIcon}>📅</span>
              <span style={styles.metaText}>{formatDate(activity.date)}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaIcon}>⏰</span>
              <span style={styles.metaText}>{activity.time}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaIcon}>📍</span>
              <span style={styles.metaText}>{activity.location}</span>
            </div>
          </div>
          <div style={styles.spotsContainer}>
            <span style={styles.spotsLabel}>剩余名额：</span>
            <span style={{
              ...styles.spotsValue,
              color: full ? '#E74C3C' : '#27AE60'
            }}>
              {full ? '名额已满' : `${availableSpots} / ${activity.capacity}`}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null

    const pages = []
    const maxVisible = 5
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2))
    let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1)

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div style={styles.paginationContainer}>
        <span style={styles.pageInfo}>第{pagination.page}页/共{pagination.totalPages}页</span>
        <button
          style={{
            ...styles.pageButton,
            ...(pagination.page === 1 ? styles.pageButtonDisabled : {})
          }}
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
        >
          上一页
        </button>
        {startPage > 1 && (
          <>
            <button style={styles.pageButton} onClick={() => handlePageChange(1)}>1</button>
            {startPage > 2 && <span style={styles.ellipsis}>...</span>}
          </>
        )}
        {pages.map(page => (
          <button
            key={page}
            style={{
              ...styles.pageButton,
              ...(page === pagination.page ? styles.pageButtonActive : {})
            }}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </button>
        ))}
        {endPage < pagination.totalPages && (
          <>
            {endPage < pagination.totalPages - 1 && <span style={styles.ellipsis}>...</span>}
            <button style={styles.pageButton} onClick={() => handlePageChange(pagination.totalPages)}>
              {pagination.totalPages}
            </button>
          </>
        )}
        <button
          style={{
            ...styles.pageButton,
            ...(pagination.page === pagination.totalPages ? styles.pageButtonDisabled : {})
          }}
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages}
        >
          下一页
        </button>
      </div>
    )
  }

  const selectedCategory = categories.find(c => c.value === category)

  return (
    <div style={styles.container}>
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>日期范围</label>
          <div style={styles.dateInputs}>
            <input
              type="date"
              style={styles.dateInput}
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
            />
            <span style={styles.dateSeparator}>至</span>
            <input
              type="date"
              style={styles.dateInput}
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
            />
          </div>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>活动类别</label>
          <div style={styles.dropdownContainer}>
            <button
              style={{
                ...styles.dropdownButton,
                background: selectedCategory?.bgColor || '#FFFFFF',
                borderColor: selectedCategory?.color || '#DDDDDD'
              }}
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <span style={{ color: selectedCategory?.color || '#2C3E50' }}>
                {selectedCategory?.label || '全部分类'}
              </span>
              <span style={styles.dropdownArrow}>▼</span>
            </button>
            {showCategoryDropdown && (
              <div style={styles.dropdownMenu} className="dropdown-menu">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    style={{
                      ...styles.dropdownItem,
                      background: category === cat.value ? cat.bgColor : 'transparent',
                      color: cat.color || '#2C3E50'
                    }}
                    onClick={() => handleCategoryChange(cat.value)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.resultsInfo}>
        <span style={styles.resultsText}>共找到 {pagination.total} 个活动</span>
      </div>

      <div style={styles.gridContainer}>
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
        ) : activities.length > 0 ? (
          activities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} />
          ))
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🔍</div>
            <p style={styles.emptyText}>暂无符合条件的活动</p>
          </div>
        )}
      </div>

      {!loading && activities.length > 0 && renderPagination()}
    </div>
  )
}

const styles = {
  container: {
    width: '100%',
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '24px',
    padding: '24px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    marginBottom: '24px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    flex: 1,
    minWidth: '200px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#7F8C8D',
  },
  dateInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  dateInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #DDDDDD',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '140px',
  },
  dateSeparator: {
    color: '#95A5A6',
    fontSize: '14px',
  },
  dropdownContainer: {
    position: 'relative' as const,
    minWidth: '160px',
  },
  dropdownButton: {
    width: '100%',
    padding: '10px 14px',
    border: '2px solid',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  dropdownArrow: {
    fontSize: '10px',
    color: '#95A5A6',
    transition: 'transform 0.2s ease-out',
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    overflow: 'hidden',
    zIndex: 50,
    animation: 'fadeIn 0.2s ease-out',
  },
  dropdownItem: {
    width: '100%',
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    backgroundColor: 'transparent',
    transition: 'all 0.2s ease-out',
  },
  resultsInfo: {
    marginBottom: '16px',
  },
  resultsText: {
    fontSize: '14px',
    color: '#7F8C8D',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
  },
  cardHeader: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.3s ease-out',
  },
  categoryTag: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  registeredBadge: {
    padding: '4px 10px',
    backgroundColor: '#27AE60',
    color: '#FFFFFF',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  cardBody: {
    padding: '20px',
  },
  activityTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2C3E50',
    marginBottom: '16px',
    lineHeight: 1.4,
    minHeight: '50px',
  },
  activityMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '16px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  metaIcon: {
    fontSize: '14px',
  },
  metaText: {
    fontSize: '13px',
    color: '#7F8C8D',
  },
  spotsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '16px',
    borderTop: '1px solid #F0F0F0',
  },
  spotsLabel: {
    fontSize: '13px',
    color: '#7F8C8D',
  },
  spotsValue: {
    fontSize: '15px',
    fontWeight: 600,
  },
  skeletonLine: {
    height: '16px',
    borderRadius: '4px',
  },
  emptyState: {
    gridColumn: '1 / -1',
    padding: '80px 20px',
    textAlign: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#95A5A6',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  pageInfo: {
    fontSize: '14px',
    color: '#7F8C8D',
    fontWeight: 500,
    marginRight: '8px',
  },
  pageButton: {
    minWidth: '40px',
    height: '40px',
    padding: '0 16px',
    border: '1px solid #DDDDDD',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    color: '#2C3E50',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease-out',
  },
  pageButtonActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
    color: '#FFFFFF',
  },
  pageButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  ellipsis: {
    padding: '0 8px',
    color: '#95A5A6',
  },
}

export default ActivityList
