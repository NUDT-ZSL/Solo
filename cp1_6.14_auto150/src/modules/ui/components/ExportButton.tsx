import React, { useState, useEffect } from 'react'
import { eventBus } from '@/utils/EventBus'

interface ExportButtonProps {
  className?: string
}

const ExportButton: React.FC<ExportButtonProps> = ({ className }) => {
  const [isExporting, setIsExporting] = useState(false)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const handleExport = () => {
      setIsExporting(true)
    }

    const handleExported = (data: { success: boolean; message?: string }) => {
      setIsExporting(false)
      if (!data.success && data.message) {
        alert(data.message)
      }
    }

    eventBus.on('report:export', handleExport)
    eventBus.on('report:exported', handleExported)

    return () => {
      eventBus.off('report:export', handleExport)
      eventBus.off('report:exported', handleExported)
    }
  }, [])

  const handleClick = () => {
    if (isExporting) return
    eventBus.emit('report:export', undefined as any)
  }

  return (
    <button
      className={className}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={isExporting}
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: isExporting ? '#64748b' : hover ? '#2563eb' : '#3b82f6',
        border: 'none',
        cursor: isExporting ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
        transition: 'all 0.3s ease',
        transform: hover ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseDown={(e) => {
        if (!isExporting) {
          e.currentTarget.style.transform = 'scale(0.95)'
        }
      }}
      onMouseUp={(e) => {
        if (!isExporting) {
          e.currentTarget.style.transform = hover ? 'scale(1.05)' : 'scale(1)'
        }
      }}
      title="导出PDF报告"
    >
      {isExporting ? (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation: 'spin 1s linear infinite',
          }}
        >
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
      ) : (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}

export default ExportButton
