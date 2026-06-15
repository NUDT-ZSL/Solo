import React from 'react';

interface LoaderProps {
  size?: number;
  color?: string;
}

const Loader: React.FC<LoaderProps> = ({ size = 36, color = '#3b82f6' }) => {
  const wheelColor = '#22c55e';

  return (
    <div
      className="loader"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        style={{
          animation: 'spin 2s linear infinite',
        }}
      >
        <circle cx="9" cy="24" r="6" fill="none" stroke={wheelColor} strokeWidth="2" />
        <circle cx="27" cy="24" r="6" fill="none" stroke={wheelColor} strokeWidth="2" />
        <line x1="9" y1="24" x2="18" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="12" x2="27" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="9" y1="24" x2="27" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="12" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="13" y1="6" x2="21" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="9" cy="24" r="1.5" fill={wheelColor} />
        <circle cx="27" cy="24" r="1.5" fill={wheelColor} />
      </svg>
    </div>
  );
};

export default Loader;
