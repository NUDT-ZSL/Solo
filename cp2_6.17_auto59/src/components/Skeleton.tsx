import React from 'react';

const Skeleton: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 640,
        padding: 20,
        borderRadius: 12,
        background: '#ffffff',
        borderLeft: '4px solid #e0e0e0',
        margin: '0 auto 16px auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#f0f0f0',
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: 100,
              height: 14,
              background: '#f0f0f0',
              borderRadius: 4,
              marginBottom: 6,
            }}
          />
          <div
            style={{
              width: 60,
              height: 12,
              background: '#f0f0f0',
              borderRadius: 4,
            }}
          />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div
            style={{
              width: 80,
              height: 12,
              background: '#f0f0f0',
              borderRadius: 4,
              marginBottom: 6,
            }}
          />
          <div
            style={{
              width: '100%',
              height: 14,
              background: '#f0f0f0',
              borderRadius: 4,
              marginBottom: 4,
            }}
          />
          <div
            style={{
              width: '80%',
              height: 14,
              background: '#f0f0f0',
              borderRadius: 4,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export const LoadingDots: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 6,
        padding: 20,
      }}
    >
      <span className="skeleton-dot" />
      <span className="skeleton-dot" />
      <span className="skeleton-dot" />
    </div>
  );
};

export default Skeleton;
