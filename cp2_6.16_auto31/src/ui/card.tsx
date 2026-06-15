import { useState } from 'react';
import { X, Tag } from 'lucide-react';
import { useAppStore } from '../data/store';

export function InfoCard() {
  const showInfoCard = useAppStore((s) => s.showInfoCard);
  const selectedArtifact = useAppStore((s) => s.selectedArtifact);
  const setShowInfoCard = useAppStore((s) => s.setShowInfoCard);
  const setSelectedArtifact = useAppStore((s) => s.setSelectedArtifact);
  const addTagToArtifact = useAppStore((s) => s.addTagToArtifact);

  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  if (!showInfoCard || !selectedArtifact) return null;

  const handleClose = () => {
    setShowInfoCard(false);
    setSelectedArtifact(null);
    setShowTagInput(false);
    setTagInput('');
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      addTagToArtifact(selectedArtifact.id, tagInput.trim());
      setTagInput('');
      setShowTagInput(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '320px',
        borderRadius: '16px',
        background: '#1a237e',
        color: '#e0e0e0',
        padding: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(129, 212, 250, 0.3)',
        zIndex: 200,
        animation: 'fadeInUp 0.3s ease-out',
      }}
    >
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translate(-50%, -40%);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%);
            }
          }
        `}
      </style>

      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: 'none',
          background: '#ff5252',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease-out',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#ff1744';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ff5252';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <X size={16} />
      </button>

      <h2
        style={{
          margin: '0 0 8px 0',
          fontSize: '20px',
          color: '#80deea',
          fontWeight: 600,
        }}
      >
        {selectedArtifact.name}
      </h2>

      <div
        style={{
          fontSize: '12px',
          color: '#78909c',
          marginBottom: '16px',
          textTransform: 'capitalize',
        }}
      >
        {selectedArtifact.type === 'pot' && '陶罐'}
        {selectedArtifact.type === 'coin' && '钱币'}
        {selectedArtifact.type === 'anchor' && '船锚'}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            fontSize: '11px',
            color: '#546e7a',
            marginBottom: '4px',
          }}
        >
          材质
        </div>
        <div style={{ fontSize: '14px' }}>{selectedArtifact.material}</div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            fontSize: '11px',
            color: '#546e7a',
            marginBottom: '4px',
          }}
        >
          估计年代
        </div>
        <div style={{ fontSize: '14px' }}>{selectedArtifact.era}</div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '11px',
            color: '#546e7a',
            marginBottom: '4px',
          }}
        >
          描述
        </div>
        <div
          style={{
            fontSize: '13px',
            lineHeight: 1.6,
            color: '#b0bec5',
          }}
        >
          {selectedArtifact.description}
        </div>
      </div>

      {selectedArtifact.tags.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '11px',
              color: '#546e7a',
              marginBottom: '8px',
            }}
          >
            标签
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {selectedArtifact.tags.map((tag, i) => (
              <span
                key={i}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0, 188, 212, 0.2)',
                  color: '#80deea',
                  fontSize: '12px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {showTagInput ? (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="输入标签..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTag();
            }}
            autoFocus
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(129, 212, 250, 0.3)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: '#e0e0e0',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleAddTag}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#00bcd4',
              color: '#00191e',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease-out',
            }}
          >
            添加
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowTagInput(true)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '10px',
            border: '1px solid rgba(129, 212, 250, 0.3)',
            background: 'rgba(0, 188, 212, 0.1)',
            color: '#80deea',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 188, 212, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 188, 212, 0.1)';
          }}
        >
          <Tag size={16} />
          添加标签
        </button>
      )}
    </div>
  );
}
