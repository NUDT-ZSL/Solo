import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  recordId: string;
  onClose: () => void;
}

const QRModal = ({ isOpen, recordId, onClose }: QRModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#00000080',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        animation: 'fadeIn 0.3s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          animation: 'scaleIn 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '8px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} style={{ color: '#64748b' }} />
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '16px' }}>
          <QRCodeSVG
            value={recordId}
            size={256}
            level="M"
            includeMargin={false}
            style={{ margin: '0 auto' }}
          />
          <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>
            请管理员扫码确认借用
          </p>
          <p style={{ marginTop: '8px', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
            记录ID: {recordId}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default QRModal;
