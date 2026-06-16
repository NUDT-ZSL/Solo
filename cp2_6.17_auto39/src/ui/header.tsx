import { Globe2 } from 'lucide-react';

export function Header() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: 20,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        background: 'rgba(13, 17, 23, 0.7)',
        border: '1px solid rgba(78, 205, 196, 0.2)',
        borderRadius: 12,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #4ecdc4, #4488ff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(78, 205, 196, 0.3)'
        }}
      >
        <Globe2 size={22} color="#fff" />
      </div>
      <div style={{ lineHeight: 1.3 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: 0.5
          }}
        >
          全球航运碳排放
        </div>
        <div style={{ fontSize: 11, color: '#8b949e', letterSpacing: 1 }}>
          SHIPPING EMISSIONS 3D · 2020-2030
        </div>
      </div>
    </div>
  );
}
