import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="suitcase-spinner">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#e85d3a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="7" width="18" height="13" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        </div>
        <p className="loading-text">正在为您生成旅行计划...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
