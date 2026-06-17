import { QRCodeSVG } from 'qrcode.react';

/* QRModal.tsx - 二维码模态框
   调用关系：被 DeviceCard / DeviceDetail 借用成功后弹出
   数据流向：接收借用记录 ID，生成包含记录 ID 的二维码，供管理员扫码确认
*/

interface QRModalProps {
  recordId: string;
  deviceName: string;
  onClose: () => void;
}

export function QRModal({ recordId, deviceName, onClose }: QRModalProps) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtnStyle} onClick={onClose} aria-label="关闭">×</button>
        <h3 style={titleStyle}>借用成功</h3>
        <p style={deviceNameStyle}>{deviceName}</p>
        <div style={qrWrapStyle}>
          <QRCodeSVG value={recordId} size={256} level="M" />
        </div>
        <p style={hintStyle}>请管理员扫码确认借还</p>
        <p style={recordIdStyle}>记录ID：{recordId}</p>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  animation: 'fadeIn 0.3s ease-out',
};

const modalStyle: React.CSSProperties = {
  position: 'relative',
  background: '#ffffff',
  borderRadius: '12px',
  padding: '16px',
  width: 'fit-content',
  textAlign: 'center',
  boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
  animation: 'popIn 0.3s ease-out',
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '12px',
  border: 'none',
  background: 'transparent',
  fontSize: '24px',
  cursor: 'pointer',
  color: '#64748b',
  lineHeight: 1,
};

const titleStyle: React.CSSProperties = {
  margin: '8px 0 4px',
  fontSize: '18px',
  color: '#1e293b',
};

const deviceNameStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: '14px',
  color: '#64748b',
};

const qrWrapStyle: React.CSSProperties = {
  padding: '8px',
  display: 'flex',
  justifyContent: 'center',
};

const hintStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: '13px',
  color: '#475569',
};

const recordIdStyle: React.CSSProperties = {
  margin: '4px 0 4px',
  fontSize: '12px',
  color: '#94a3b8',
  fontFamily: 'monospace',
};
