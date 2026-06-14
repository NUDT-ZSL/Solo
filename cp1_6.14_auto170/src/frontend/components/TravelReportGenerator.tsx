import React from 'react'
import { Trip } from '../api-client'
import { generateReportHtml } from '../report-service'

interface TravelReportGeneratorProps {
  trip: Trip
  generating: boolean
  onClick: () => void
}

const TravelReportGenerator: React.FC<TravelReportGeneratorProps> = ({
  trip,
  generating,
  onClick,
}) => {
  const handleGenerate = () => {
    onClick()
    const html = generateReportHtml(trip)
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(html)
      newWindow.document.close()
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      style={{
        position: 'fixed',
        right: '32px',
        bottom: '32px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: '#7c3aed',
        color: 'white',
        border: 'none',
        fontSize: '24px',
        cursor: generating ? 'not-allowed' : 'pointer',
        boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        zIndex: 100,
      }}
      onMouseEnter={e => {
        if (!generating) {
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.5)'
          e.currentTarget.style.filter = 'brightness(1.1)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.4)'
        e.currentTarget.style.filter = 'brightness(1)'
      }}
      title="生成游记"
    >
      {generating ? (
        <span
          style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '2px solid white',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : (
        '📝'
      )}
    </button>
  )
}

export default TravelReportGenerator
