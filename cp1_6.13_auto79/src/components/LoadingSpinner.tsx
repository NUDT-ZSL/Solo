import React from 'react'

interface LoadingSpinnerProps {
  size?: number
  message?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 40, message }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      gap: '16px'
    }}>
      <div
        style={{
          width: size,
          height: size,
          border: `${Math.max(3, size / 10)}px solid #ffffff`,
          borderTop: `${Math.max(3, size / 10)}px solid #f59e0b`,
          borderRight: `${Math.max(3, size / 10)}px solid #f59e0b`,
          borderBottom: `${Math.max(3, size / 10)}px solid #f59e0b`,
          borderRadius: '50%',
          animation: 'spin 1s infinite linear'
        }}
      />
      {message && (
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{message}</p>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default LoadingSpinner
