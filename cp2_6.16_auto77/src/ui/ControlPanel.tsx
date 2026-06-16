import { Play, Pause } from 'lucide-react';

interface ControlPanelProps {
  isPlaying: boolean;
  onToggle: () => void;
}

export default function ControlPanel({ isPlaying, onToggle }: ControlPanelProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        width: '200px',
        height: '64px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 100,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '80px',
          height: '32px',
          borderRadius: '8px',
          background: '#1a1a2e',
          color: '#ffffff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'background 0.3s ease, transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#16213e';
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#1a1a2e';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
      >
        {isPlaying ? (
          <>
            <Pause size={16} />
            <span>暂停</span>
          </>
        ) : (
          <>
            <Play size={16} />
            <span>继续</span>
          </>
        )}
      </button>
    </div>
  );
}
