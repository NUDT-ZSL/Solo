import React, { useRef } from 'react'
import { Dispute } from '../services/apiClient'
import { disputeTypeLabels, statusLabels, formatDateShort, getStatusGradient } from './shared'

interface DisputeListProps {
  disputes: Dispute[]
  total: number
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  selectedId: string | null
  filterType: string
  startDate: string
  endDate: string
  listFading: boolean
  onSelectedIdChange: (id: string) => void
  onFilterTypeChange: (type: string) => void
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onLoadMore: () => void
}

const DisputeList: React.FC<DisputeListProps> = ({
  disputes,
  total,
  loading,
  loadingMore,
  hasMore,
  selectedId,
  filterType,
  startDate,
  endDate,
  listFading,
  onSelectedIdChange,
  onFilterTypeChange,
  onStartDateChange,
  onEndDateChange,
  onLoadMore,
}) => {
  const listRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    if (!listRef.current || loadingMore || !hasMore) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      onLoadMore()
    }
  }

  return (
    <aside style={{
      width: '280px',
      flexShrink: 0,
      backgroundColor: '#fff',
      borderRight: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div>
          <div style={{ fontSize: '13px', color: '#666', fontWeight: 500, marginBottom: '4px' }}>纠纷类型</div>
          <select
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#fff',
              cursor: 'pointer',
              width: '100%',
            }}
            value={filterType}
            onChange={e => onFilterTypeChange(e.target.value)}
          >
            {Object.entries(disputeTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: '#666', fontWeight: 500, marginBottom: '4px' }}>时间范围</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="date"
              style={{
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '13px',
                outline: 'none',
                flex: 1,
                cursor: 'pointer',
              }}
              value={startDate}
              onChange={e => onStartDateChange(e.target.value)}
            />
            <input
              type="date"
              style={{
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '13px',
                outline: 'none',
                flex: 1,
                cursor: 'pointer',
              }}
              value={endDate}
              onChange={e => onEndDateChange(e.target.value)}
            />
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#999' }}>
          共 {total} 条纠纷
        </div>
      </div>

      <div
        ref={listRef}
        className="list-fade"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          opacity: listFading ? 0 : 1,
        }}
        onScroll={handleScroll}
      >
        {loading && disputes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>加载中...</div>
        ) : disputes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>暂无纠纷数据</div>
        ) : (
          disputes.map(dispute => (
            <div
              key={dispute.id}
              style={{
                padding: '14px',
                borderRadius: '10px',
                marginBottom: '10px',
                cursor: 'pointer',
                border: '2px solid transparent',
                transition: 'all 0.2s ease',
                backgroundColor: selectedId === dispute.id ? '#FFF7ED' : '#fafafa',
                ...(selectedId === dispute.id ? {
                  borderColor: '#FF8C00',
                  boxShadow: '0 2px 8px rgba(255,140,0,0.15)',
                } : {}),
              }}
              onClick={() => onSelectedIdChange(dispute.id)}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  <img src={dispute.petAvatar} alt={dispute.petName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#333', margin: 0 }}>{dispute.petName}</h3>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                    {formatDateShort(dispute.fosterStartDate)} ~ {formatDateShort(dispute.fosterEndDate)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  backgroundColor: '#FFF0E0',
                  color: '#FF8C00',
                  marginTop: '6px',
                }}>
                  {disputeTypeLabels[dispute.disputeType]}
                </span>
                <span
                  className="status-badge-transition"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    marginTop: '6px',
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
  )
}

export default DisputeList
