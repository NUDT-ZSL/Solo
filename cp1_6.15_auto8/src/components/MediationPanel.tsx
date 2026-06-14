import React, { useState, useEffect } from 'react'
import { Dispute, MediationSuggestion } from '../services/apiClient'
import { apiClient } from '../services/apiClient'

interface MediationPanelProps {
  dispute: Dispute
  onSuggestionAdopted: (updatedSuggestion: MediationSuggestion) => void
  onSuggestionsGenerated: (suggestions: MediationSuggestion[]) => void
}

const MediationPanel: React.FC<MediationPanelProps> = ({
  dispute,
  onSuggestionAdopted,
  onSuggestionsGenerated,
}) => {
  const [generating, setGenerating] = useState(false)
  const [adoptedCount, setAdoptedCount] = useState(0)
  const [bounceKey, setBounceKey] = useState(0)

  useEffect(() => {
    const count = dispute.suggestions.filter(s => s.adopted).length
    setAdoptedCount(count)
  }, [dispute.id, dispute.suggestions])

  const handleGenerate = async () => {
    if (!dispute) return
    setGenerating(true)
    try {
      const res = await apiClient.generateSuggestions(dispute.id)
      onSuggestionsGenerated(res.data)
    } catch (err) {
      console.error('Failed to generate suggestions:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleAdopt = async (suggestionId: string) => {
    try {
      const res = await apiClient.adoptSuggestion(dispute.id, suggestionId)
      if (res.data.adopted) {
        const newCount = adoptedCount + 1
        setAdoptedCount(newCount)
        setBounceKey(prev => prev + 1)
      }
      onSuggestionAdopted(res.data)
    } catch (err) {
      console.error('Failed to adopt suggestion:', err)
    }
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      animation: 'fadeIn 0.2s ease',
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: 600,
        color: '#333',
        margin: '0 0 16px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        🤖 AI 调解建议
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span
            key={bounceKey}
            className={`count-badge${bounceKey > 0 ? ' count-badge--bounce' : ''}`}
          >
            {adoptedCount}
          </span>
          <span style={{ fontSize: '13px', color: '#888', fontWeight: 400 }}>已采纳</span>
        </span>
      </h3>

      {dispute.suggestions.length === 0 ? (
        <button
          style={{
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
          }}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? '⏳ 正在生成建议...' : '✨ 生成调解建议'}
        </button>
      ) : (
        <>
          <button
            style={{
              padding: '12px 24px',
              backgroundColor: '#666',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginBottom: '16px',
            }}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? '⏳ 重新生成中...' : '🔄 重新生成建议'}
          </button>
          <div>
            {dispute.suggestions.map(suggestion => (
              <div
                key={suggestion.id}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: '#fff8f0',
                  border: '1px solid #ffe0c2',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div style={{ fontSize: '14px', color: '#333', flex: 1, lineHeight: 1.6 }}>
                  {suggestion.content}
                </div>
                {suggestion.adopted ? (
                  <div style={{
                    padding: '6px 14px',
                    backgroundColor: '#e8f5e9',
                    color: '#2e7d32',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}>
                    ✓ 已采纳
                  </div>
                ) : (
                  <button
                    style={{
                      padding: '8px 18px',
                      backgroundColor: '#4A3728',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleAdopt(suggestion.id)}
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
  )
}

export default MediationPanel
