import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  apiClient,
  Dispute,
  DisputeStatus,
  ChatMessage,
  MediationSuggestion,
  EvidenceImage,
} from '../services/apiClient'

const disputeTypeLabels: Record<string, string> = {
  all: '全部类型',
  service_incomplete: '服务未完成',
  health_issue: '健康问题',
  fee_dispute: '费用争议',
}

const statusLabels: Record<DisputeStatus, string> = {
  pending: '待处理',
  mediating: '调解中',
  resolved: '已解决',
}

const roleLabels: Record<string, string> = {
  owner: '宠物主人',
  sitter: '寄养人',
  customer_service: '客服',
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const formatDateShort = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#4A3728',
    color: '#fff',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 600,
    margin: 0,
  },
  main: {
    display: 'flex',
    height: 'calc(100vh - 64px)',
  },
  sidebar: {
    width: '280px',
    flexShrink: 0,
    backgroundColor: '#fff',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  filterSection: {
    padding: '16px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  filterLabel: {
    fontSize: '13px',
    color: '#666',
    fontWeight: 500,
    marginBottom: '4px',
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
    cursor: 'pointer',
    width: '100%',
  },
  dateRange: {
    display: 'flex',
    gap: '8px',
  },
  dateInput: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '13px',
    outline: 'none',
    flex: 1,
    cursor: 'pointer',
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  listFade: {
    transition: 'opacity 0.2s ease',
  },
  card: {
    padding: '14px',
    borderRadius: '10px',
    marginBottom: '10px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
    backgroundColor: '#fafafa',
  },
  cardActive: {
    borderColor: '#FF8C00',
    backgroundColor: '#FFF7ED',
    boxShadow: '0 2px 8px rgba(255,140,0,0.15)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#FF8C00',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 600,
    fontSize: '16px',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  petName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#333',
    margin: 0,
  },
  fosterTime: {
    fontSize: '12px',
    color: '#888',
    marginTop: '2px',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    backgroundColor: '#FFF0E0',
    color: '#FF8C00',
    marginTop: '6px',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    transition: 'all 0.3s ease',
    marginTop: '6px',
  },
  detailPanel: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    animation: 'slideIn 0.3s ease',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  detailTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#333',
    margin: 0,
  },
  statusButtons: {
    display: 'flex',
    gap: '8px',
  },
  statusButton: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '18px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    animation: 'fadeIn 0.2s ease',
  },
  infoCardTitle: {
    fontSize: '14px',
    color: '#888',
    margin: '0 0 12px 0',
    fontWeight: 500,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '14px',
  },
  infoLabel: {
    color: '#666',
  },
  infoValue: {
    color: '#333',
    fontWeight: 500,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    animation: 'fadeIn 0.2s ease',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  thumbnails: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  thumbnail: {
    width: '120px',
    height: '90px',
    borderRadius: '8px',
    cursor: 'pointer',
    objectFit: 'cover' as const,
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  description: {
    fontSize: '14px',
    color: '#555',
    lineHeight: 1.7,
    backgroundColor: '#f9f9f9',
    padding: '14px',
    borderRadius: '8px',
    margin: 0,
  },
  timeline: {
    position: 'relative' as const,
    paddingLeft: '28px',
  },
  timelineLine: {
    position: 'absolute' as const,
    left: '8px',
    top: '8px',
    bottom: '8px',
    width: '2px',
    backgroundColor: '#e0e0e0',
  },
  messageItem: {
    position: 'relative' as const,
    marginBottom: '16px',
    padding: '12px 16px',
    borderRadius: '10px',
    backgroundColor: '#f5f9ff',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  messageItemHighlight: {
    backgroundColor: '#E3F2FD',
    boxShadow: '0 0 0 3px #90CAF9',
  },
  messageDot: {
    position: 'absolute' as const,
    left: '-24px',
    top: '18px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#FF8C00',
    border: '2px solid #fff',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  messageRole: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#4A3728',
  },
  messageTime: {
    fontSize: '12px',
    color: '#999',
  },
  messageContent: {
    fontSize: '14px',
    color: '#333',
    lineHeight: 1.6,
  },
  orderNode: {
    marginTop: '10px',
    padding: '8px 12px',
    backgroundColor: '#fff3e0',
    borderRadius: '6px',
    borderLeft: '3px solid #FF8C00',
    fontSize: '13px',
    color: '#555',
  },
  genButton: {
    padding: '12px 24px',
    backgroundColor: '#FF8C00',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginBottom: '16px',
  },
  suggestionCard: {
    padding: '16px',
    borderRadius: '10px',
    backgroundColor: '#fff8f0',
    border: '1px solid #ffe0c2',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  suggestionContent: {
    fontSize: '14px',
    color: '#333',
    flex: 1,
    lineHeight: 1.6,
  },
  adoptButton: {
    padding: '8px 18px',
    backgroundColor: '#4A3728',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  adoptedBadge: {
    padding: '6px 14px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: '#FF8C00',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'transform 0.3s ease',
  },
  countBadgeBounce: {
    animation: 'bounce 0.5s ease',
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    cursor: 'pointer',
    padding: '20px',
  },
  modalImg: {
    maxWidth: '90%',
    maxHeight: '90vh',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
  },
  loadingState: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
  bounceBadgeContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
}

const keyframesStyle = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes bounce {
    0%, 100% { transform: scale(1); }
    30% { transform: scale(1.4); }
    60% { transform: scale(0.9); }
  }
  button:active {
    transform: scale(0.95);
  }
  .scroll-fade-enter {
    opacity: 1;
  }
  .scroll-fade-exit {
    opacity: 0;
  }
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #aaa;
  }
`

const DisputeConsole: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [listFading, setListFading] = useState(false)
  const [detailKey, setDetailKey] = useState(0)
  const [highlightedMessage, setHighlightedMessage] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<EvidenceImage | null>(null)
  const [adoptedCount, setAdoptedCount] = useState(0)
  const [bounceBadge, setBounceBadge] = useState(false)
  const [generating, setGenerating] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const hasMore = disputes.length < total

  const fetchDisputes = useCallback(async (
    pageNum: number,
    type: string,
    sDate: string,
    eDate: string,
    append: boolean = false
  ) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    try {
      const res = await apiClient.getDisputes({
        page: pageNum,
        pageSize: 10,
        type: type !== 'all' ? type : undefined,
        startDate: sDate || undefined,
        endDate: eDate || undefined,
      })
      setTotal(res.total)
      if (append) {
        setDisputes(prev => [...prev, ...res.data])
      } else {
        setDisputes(res.data)
      }
      setPage(pageNum)
      if (res.data.length > 0 && !selectedId && !append) {
        setSelectedId(res.data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch disputes:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedId])

  useEffect(() => {
    fetchDisputes(1, filterType, startDate, endDate)
  }, [])

  useEffect(() => {
    setListFading(true)
    const timer = setTimeout(() => {
      fetchDisputes(1, filterType, startDate, endDate)
      setTimeout(() => setListFading(false), 50)
    }, 200)
    return () => clearTimeout(timer)
  }, [filterType, startDate, endDate, fetchDisputes])

  useEffect(() => {
    if (!selectedId) return
    const fetchDetail = async () => {
      try {
        const res = await apiClient.getDisputeById(selectedId)
        setSelectedDispute(res.data)
        setDetailKey(prev => prev + 1)
        setAdoptedCount(res.data.suggestions.filter(s => s.adopted).length)
        setHighlightedMessage(null)
      } catch (err) {
        console.error('Failed to fetch dispute detail:', err)
      }
    }
    fetchDetail()
  }, [selectedId])

  const handleScroll = () => {
    if (!listRef.current || loadingMore || !hasMore) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      fetchDisputes(page + 1, filterType, startDate, endDate, true)
    }
  }

  const handleStatusChange = async (status: DisputeStatus) => {
    if (!selectedDispute) return
    try {
      const res = await apiClient.updateDisputeStatus(selectedDispute.id, status)
      setSelectedDispute(res.data)
      setDisputes(prev => prev.map(d => d.id === res.data.id ? res.data : d))
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleGenerateSuggestions = async () => {
    if (!selectedDispute) return
    setGenerating(true)
    try {
      const res = await apiClient.generateSuggestions(selectedDispute.id)
      setSelectedDispute(prev => prev ? { ...prev, suggestions: res.data } : null)
    } catch (err) {
      console.error('Failed to generate suggestions:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleAdoptSuggestion = async (suggestionId: string) => {
    if (!selectedDispute) return
    try {
      const res = await apiClient.adoptSuggestion(selectedDispute.id, suggestionId)
      if (res.data.adopted) {
        setAdoptedCount(prev => prev + 1)
        setBounceBadge(true)
        setTimeout(() => setBounceBadge(false), 500)
      }
      setSelectedDispute(prev => {
        if (!prev) return null
        return {
          ...prev,
          suggestions: prev.suggestions.map(s => s.id === suggestionId ? res.data : s),
        }
      })
    } catch (err) {
      console.error('Failed to adopt suggestion:', err)
    }
  }

  const getStatusGradient = (status: DisputeStatus): string => {
    switch (status) {
      case 'pending': return 'linear-gradient(135deg, #FFB74D, #FF8C00)'
      case 'mediating': return 'linear-gradient(135deg, #64B5F6, #1976D2)'
      case 'resolved': return 'linear-gradient(135deg, #81C784, #388E3C)'
    }
  }

  const getStatusButtonStyle = (status: DisputeStatus, isActive: boolean): React.CSSProperties => {
    const gradient = getStatusGradient(status)
    if (isActive) {
      return { ...styles.statusButton, background: gradient, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
    }
    return { ...styles.statusButton, background: '#f0f0f0', color: '#666' }
  }

  return (
    <div style={styles.app}>
      <style>{keyframesStyle}</style>

      <header style={styles.header}>
        <span style={{ fontSize: '24px' }}>🐾</span>
        <h1 style={styles.headerTitle}>宠物寄养纠纷调解工作台</h1>
      </header>

      <div style={styles.main}>
        <aside style={styles.sidebar}>
          <div style={styles.filterSection}>
            <div>
              <div style={styles.filterLabel}>纠纷类型</div>
              <select
                style={styles.select}
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                {Object.entries(disputeTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={styles.filterLabel}>时间范围</div>
              <div style={styles.dateRange}>
                <input
                  type="date"
                  style={styles.dateInput}
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <input
                  type="date"
                  style={styles.dateInput}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              共 {total} 条纠纷
            </div>
          </div>

          <div
            ref={listRef}
            style={{
              ...styles.listContainer,
              ...styles.listFade,
              opacity: listFading ? 0 : 1,
            }}
            onScroll={handleScroll}
          >
            {loading && disputes.length === 0 ? (
              <div style={styles.loadingState}>加载中...</div>
            ) : disputes.length === 0 ? (
              <div style={styles.emptyState}>暂无纠纷数据</div>
            ) : (
              disputes.map(dispute => (
                <div
                  key={dispute.id}
                  style={{
                    ...styles.card,
                    ...(selectedId === dispute.id ? styles.cardActive : {}),
                  }}
                  onClick={() => setSelectedId(dispute.id)}
                  onMouseEnter={e => {
                    if (selectedId !== dispute.id) {
                      ;(e.currentTarget as HTMLDivElement).style.backgroundColor = '#f0f0f0'
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedId !== dispute.id) {
                      ;(e.currentTarget as HTMLDivElement).style.backgroundColor = '#fafafa'
                    }
                  }}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.avatar}>
                      <img src={dispute.petAvatar} alt={dispute.petName} style={styles.avatarImg} />
                    </div>
                    <div style={styles.cardInfo}>
                      <h3 style={styles.petName}>{dispute.petName}</h3>
                      <div style={styles.fosterTime}>
                        {formatDateShort(dispute.fosterStartDate)} ~ {formatDateShort(dispute.fosterEndDate)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={styles.typeBadge}>{disputeTypeLabels[dispute.disputeType]}</span>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: getStatusGradient(dispute.disputeStatus),
                        color: '#fff',
                      }}
                    >
                      {statusLabels[dispute.disputeStatus]}
                    </span>
                  </div>
                </div>
              ))
            )}
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '16px', color: '#999', fontSize: '13px' }}>
                加载更多...
              </div>
            )}
            {!hasMore && disputes.length > 0 && (
              <div style={{ textAlign: 'center', padding: '16px', color: '#bbb', fontSize: '13px' }}>
                已加载全部
              </div>
            )}
          </div>
        </aside>

        <div style={styles.detailPanel} key={detailKey}>
          {!selectedDispute ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <div>请从左侧选择一个纠纷查看详情</div>
            </div>
          ) : (
            <>
              <div style={styles.detailHeader}>
                <div>
                  <h2 style={styles.detailTitle}>
                    {selectedDispute.petName} 的寄养纠纷
                  </h2>
                  <div style={{ color: '#888', marginTop: '6px', fontSize: '14px' }}>
                    纠纷编号：{selectedDispute.id.slice(0, 8).toUpperCase()} · 创建于 {formatDate(selectedDispute.createdAt)}
                  </div>
                </div>
                <div style={styles.statusButtons}>
                  {(['pending', 'mediating', 'resolved'] as DisputeStatus[]).map(status => (
                    <button
                      key={status}
                      style={getStatusButtonStyle(status, selectedDispute.disputeStatus === status)}
                      onClick={() => handleStatusChange(status)}
                    >
                      {statusLabels[status]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.cardGrid}>
                <div style={styles.infoCard}>
                  <h3 style={styles.infoCardTitle}>🐕 宠物信息</h3>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>宠物昵称</span>
                    <span style={styles.infoValue}>{selectedDispute.petName}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>寄养类型</span>
                    <span style={styles.infoValue}>{disputeTypeLabels[selectedDispute.disputeType]}</span>
                  </div>
                </div>
                <div style={styles.infoCard}>
                  <h3 style={styles.infoCardTitle}>👥 双方信息</h3>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>宠物主人</span>
                    <span style={styles.infoValue}>{selectedDispute.ownerName}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>寄养人</span>
                    <span style={styles.infoValue}>{selectedDispute.sitterName}</span>
                  </div>
                </div>
                <div style={styles.infoCard}>
                  <h3 style={styles.infoCardTitle}>📅 寄养时间</h3>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>开始时间</span>
                    <span style={styles.infoValue}>{formatDate(selectedDispute.fosterStartDate)}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>结束时间</span>
                    <span style={styles.infoValue}>{formatDate(selectedDispute.fosterEndDate)}</span>
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📝 纠纷描述</h3>
                <p style={styles.description}>{selectedDispute.description}</p>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>🖼️ 用户证据 ({selectedDispute.evidenceImages.length}张)</h3>
                <div style={styles.thumbnails}>
                  {selectedDispute.evidenceImages.map(img => (
                    <img
                      key={img.id}
                      src={img.thumbnail}
                      alt={img.description}
                      style={styles.thumbnail}
                      title={img.description}
                      onClick={() => setLightboxImage(img)}
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)'
                        ;(e.currentTarget as HTMLImageElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'
                        ;(e.currentTarget as HTMLImageElement).style.boxShadow = 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>💬 聊天记录时间轴</h3>
                <div style={styles.timeline}>
                  <div style={styles.timelineLine}></div>
                  {selectedDispute.chatMessages.map((msg: ChatMessage) => (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.messageItem,
                        ...(highlightedMessage === msg.id ? styles.messageItemHighlight : {}),
                      }}
                      onClick={() => setHighlightedMessage(
                        highlightedMessage === msg.id ? null : msg.id
                      )}
                    >
                      <div style={styles.messageDot}></div>
                      <div style={styles.messageHeader}>
                        <span style={styles.messageRole}>
                          {roleLabels[msg.role]}
                          {msg.type === 'image' && ' 📷'}
                        </span>
                        <span style={styles.messageTime}>{formatDate(msg.timestamp)}</span>
                      </div>
                      <div style={styles.messageContent}>
                        {msg.type === 'image' ? (
                          <img
                            src={`https://placehold.co/200x150/FF8C00/ffffff?text=Chat+Image`}
                            alt="聊天图片"
                            style={{ borderRadius: '6px', marginTop: '4px', cursor: 'pointer' }}
                          />
                        ) : (
                          msg.content
                        )}
                      </div>
                      {highlightedMessage === msg.id && msg.orderNode && (
                        <div style={styles.orderNode}>
                          <strong>{msg.orderNode.label}：</strong>
                          {formatDate(msg.orderNode.time)}
                        </div>
                      )}
                      {msg.orderNode && highlightedMessage !== msg.id && (
                        <div style={{ fontSize: '12px', color: '#FF8C00', marginTop: '8px' }}>
                          🔗 点击查看关联订单节点
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                  🤖 AI 调解建议
                  <span style={styles.bounceBadgeContainer}>
                    <span
                      style={{
                        ...styles.countBadge,
                        ...(bounceBadge ? styles.countBadgeBounce : {}),
                      }}
                    >
                      {adoptedCount}
                    </span>
                    <span style={{ fontSize: '13px', color: '#888', fontWeight: 400 }}>已采纳</span>
                  </span>
                </h3>

                {selectedDispute.suggestions.length === 0 ? (
                  <button
                    style={styles.genButton}
                    onClick={handleGenerateSuggestions}
                    disabled={generating}
                  >
                    {generating ? '⏳ 正在生成建议...' : '✨ 生成调解建议'}
                  </button>
                ) : (
                  <>
                    <button
                      style={{ ...styles.genButton, backgroundColor: '#666', marginLeft: '0' }}
                      onClick={handleGenerateSuggestions}
                      disabled={generating}
                    >
                      {generating ? '⏳ 重新生成中...' : '🔄 重新生成建议'}
                    </button>
                    <div>
                      {selectedDispute.suggestions.map((suggestion: MediationSuggestion) => (
                        <div key={suggestion.id} style={styles.suggestionCard}>
                          <div style={styles.suggestionContent}>
                            {suggestion.content}
                          </div>
                          {suggestion.adopted ? (
                            <div style={styles.adoptedBadge}>
                              ✓ 已采纳
                            </div>
                          ) : (
                            <button
                              style={styles.adoptButton}
                              onClick={() => handleAdoptSuggestion(suggestion.id)}
                            >
                              采纳建议
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {selectedDispute.handlingRecords.length > 0 && (
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>📋 处理记录</h3>
                  <div>
                    {selectedDispute.handlingRecords.map((record: string, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '6px',
                          marginBottom: '8px',
                          fontSize: '13px',
                          color: '#555',
                        }}
                      >
                        {record}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {lightboxImage && (
          <div style={styles.modal} onClick={() => setLightboxImage(null)}>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.description}
              style={styles.modalImg}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default DisputeConsole
