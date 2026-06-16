interface PauseMenuProps {
  onResume: () => void;
}

export function PauseMenu({ onResume }: PauseMenuProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        zIndex: 100,
      }}
    >
      <h2
        style={{
          color: '#ffffff',
          fontSize: '36px',
          fontWeight: 'bold',
          marginBottom: '40px',
          textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
        }}
      >
        暂停中
      </h2>
      <button
        onClick={onResume}
        style={{
          width: '160px',
          height: '52px',
          borderRadius: '26px',
          background: 'linear-gradient(135deg, #c084fc, #a855f7)',
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer',
          transition: 'filter 0.3s ease',
          boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        继续游戏
      </button>
    </div>
  );
}
