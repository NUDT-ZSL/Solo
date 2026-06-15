import React, { useState } from 'react'
import { Dispute, DisputeStatus, EvidenceImage } from '../services/apiClient'
import { disputeTypeLabels, statusLabels, formatDate, getStatusGradient } from './shared'
import ChatTimeline from './ChatTimeline'
import MediationPanel from './MediationPanel'

interface DisputeDetailProps {
  dispute: Dispute
  onStatusChange: (status: DisputeStatus) => void
  onDisputeUpdate: (dispute: Dispute) => void
}

const DisputeDetail: React.FC<DisputeDetailProps> = ({
  dispute,
  onStatusChange,
  onDisputeUpdate,
}) => {
  const [lightboxImage, setLightboxImage] = useState<EvidenceImage | null>(null)

  const getStatusButtonStyle = (status: DisputeStatus, isActive: boolean): React.CSSProperties => {
    const gradient = getStatusGradient(status)
    if (isActive) {
      return {
        padding: '8px 16px',
        borderRadius: '20px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: gradient,
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }
    }
    return {
      padding: '8px 16px',
      borderRadius: '20px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500,
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      background: '#f0f0f0',
      color: '#666',
    }
  }

  const handleSuggestionAdopted = (updatedSuggestion: any) => {
    onDisputeUpdate({
      ...dispute,
      suggestions: dispute.suggestions.map(s =>
        s.id === updatedSuggestion.id ? updatedSuggestion : s
      ),
      handlingRecords: [
        ...dispute.handlingRecords,
        `[${new Date().toLocaleString('zh-CN')}] 采纳调解建议：${updatedSuggestion.content}`,
      ],
    })
  }

  const handleSuggestionsGenerated = (suggestions: any) => {
    onDisputeUpdate({
      ...dispute,
      suggestions,
    })
  }

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
      animation: 'slideIn 0.3s ease',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#333', margin: 0 }}>
            {dispute.petName} 的寄养纠纷
          </h2>
          <div style={{ color: '#888', marginTop: '6px', fontSize: '14px' }}>
            纠纷编号：{dispute.id.slice(0, 8).toUpperCase()} · 创建于 {formatDate(dispute.createdAt)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['pending', 'mediating', 'resolved'] as DisputeStatus[]).map(status => (
            <button
              key={status}
              style={getStatusButtonStyle(status, dispute.disputeStatus === status)}
              onClick={() => onStatusChange(status)}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <h3 style={{ fontSize: '14px', color: '#888', margin: '0 0 12px 0', fontWeight: 500 }}>🐕 宠物信息</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>宠物昵称</span>
            <span style={{ color: '#333', fontWeight: 500 }}>{dispute.petName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>寄养类型</span>
            <span style={{ color: '#333', fontWeight: 500 }}>{disputeTypeLabels[dispute.disputeType]}</span>
          </div>
        </div>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <h3 style={{ fontSize: '14px', color: '#888', margin: '0 0 12px 0', fontWeight: 500 }}>👥 双方信息</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>宠物主人</span>
            <span style={{ color: '#333', fontWeight: 500 }}>{dispute.ownerName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>寄养人</span>
            <span style={{ color: '#333', fontWeight: 500 }}>{dispute.sitterName}</span>
          </div>
        </div>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <h3 style={{ fontSize: '14px', color: '#888', margin: '0 0 12px 0', fontWeight: 500 }}>📅 寄养时间</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>开始时间</span>
            <span style={{ color: '#333', fontWeight: 500 }}>{formatDate(dispute.fosterStartDate)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>结束时间</span>
            <span style={{ color: '#333', fontWeight: 500 }}>{formatDate(dispute.fosterEndDate)}</span>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        animation: 'fadeIn 0.2s ease',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333', margin: '0 0 16px 0' }}>📝 纠纷描述</h3>
        <p style={{
          fontSize: '14px',
          color: '#555',
          lineHeight: 1.7,
          backgroundColor: '#f9f9f9',
          padding: '14px',
          borderRadius: '8px',
          margin: 0,
        }}>{dispute.description}</p>
      </div>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        animation: 'fadeIn 0.2s ease',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333', margin: '0 0 16px 0' }}>
          🖼️ 用户证据 ({dispute.evidenceImages.length}张)
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {dispute.evidenceImages.map(img => (
            <img
              key={img.id}
              src={img.thumbnail}
              alt={img.description}
              title={img.description}
              style={{
                width: '120px',
                height: '90px',
                borderRadius: '8px',
                cursor: 'pointer',
                objectFit: 'cover',
                border: '2px solid transparent',
                transition: 'all 0.2s ease',
              }}
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

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        animation: 'fadeIn 0.2s ease',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333', margin: '0 0 16px 0' }}>💬 聊天记录时间轴</h3>
        <ChatTimeline messages={dispute.chatMessages} />
      </div>

      <MediationPanel
        dispute={dispute}
        onSuggestionAdopted={handleSuggestionAdopted}
        onSuggestionsGenerated={handleSuggestionsGenerated}
      />

      {dispute.handlingRecords.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333', margin: '0 0 16px 0' }}>📋 处理记录</h3>
          <div>
            {dispute.handlingRecords.map((record, idx) => (
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

      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
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
          }}
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage.url}
            alt={lightboxImage.description}
            style={{
              maxWidth: '90%',
              maxHeight: '90vh',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

export default DisputeDetail
