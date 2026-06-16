import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  galleryId: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareUrl, galleryId }) => {
  const [closing, setClosing] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1a1a2e',
          light: '#ffffff'
        }
      }).then(url => {
        setQrDataUrl(url);
      }).catch(() => {
        setQrDataUrl('');
      });
    }
  }, [isOpen, shareUrl]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 300);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className={`modal-content ${closing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">🔗 分享画廊</h3>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
          画廊已保存，分享链接有效期为7天
        </p>

        {qrDataUrl ? (
          <div className="qr-container">
            <img src={qrDataUrl} alt="分享二维码" style={{ width: '200px', height: '200px' }} />
          </div>
        ) : (
          <div className="loading">生成二维码中...</div>
        )}

        <div className="share-link">
          <input type="text" value={shareUrl} readOnly />
          <button className="btn btn-primary btn-small" onClick={handleCopy}>
            {copied ? '✓ 已复制' : '复制'}
          </button>
        </div>

        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          画廊ID: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
            {galleryId}
          </code>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
