import type { Device } from '../types';
import { StatusBadge } from './StatusBadge';
import { QRModal } from './QRModal';
import { useBorrow } from '../hooks/useBorrow';

/* DeviceCard.tsx - 设备卡片组件
   调用关系：被 src/pages/Overview.tsx 渲染为网格项
   props：device（设备对象）+ userId（当前借用人id）
   数据流：点击借用 → useBorrow → borrowApi.submitBorrow → 成功后弹出 QRModal
   样式：240x320，圆角12px，白底，悬浮上移4px+阴影加深，过渡0.3s
*/

interface DeviceCardProps {
  device: Device;
  userId: string;
  userCredit: number;
  onBorrowed?: () => void;
}

export function DeviceCard({ device, userId, userCredit, onBorrowed }: DeviceCardProps) {
  const { loading, error, data, borrow } = useBorrow();

  const isIdle = device.status === 'idle';
  const creditOk = userCredit >= device.minCreditScore;
  const disabled = !isIdle || !creditOk;

  const handleClick = () => {
    if (disabled || loading) return;
    borrow(device.id, userId);
  };

  const handleClose = () => {
    onBorrowed?.();
  };

  return (
    <>
      <div style={cardStyle} className="device-card">
        <div style={imgWrapStyle}>
          <img src={device.imageUrl} alt={device.name} style={imgStyle} loading="lazy" />
          <div style={badgePosStyle}>
            <StatusBadge status={device.status} />
          </div>
        </div>
        <div style={bodyStyle}>
          <span style={typeTagStyle}>{device.type}</span>
          <h3 style={nameStyle}>{device.name}</h3>
          <div style={creditLineStyle}>
            <span style={creditTextStyle}>信用要求 ≥ {device.minCreditScore}</span>
            {!creditOk && isIdle && (
              <span style={insufficientStyle}>分数不足</span>
            )}
          </div>
          <button
            style={btnStyle(disabled)}
            disabled={disabled}
            onClick={handleClick}
            className="borrow-btn"
          >
            {loading ? '处理中…' : isIdle ? (creditOk ? '借用' : '信用不足') : '不可借'}
          </button>
          {error && <p style={errStyle}>{error}</p>}
        </div>
      </div>
      {data && (
        <QRModal
          recordId={data.record.id}
          deviceName={device.name}
          onClose={handleClose}
        />
      )}
    </>
  );
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '240px',
  height: '320px',
  background: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  cursor: 'default',
};

const imgWrapStyle: React.CSSProperties = {
  position: 'relative',
  height: '150px',
  background: '#f1f5f9',
  flexShrink: 0,
};

const imgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const badgePosStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
};

const bodyStyle: React.CSSProperties = {
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  flex: 1,
};

const typeTagStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  fontSize: '11px',
  color: '#475569',
  background: '#f1f5f9',
  padding: '2px 8px',
  borderRadius: '6px',
};

const nameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 600,
  color: '#1e293b',
  lineHeight: 1.3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  minHeight: '36px',
};

const creditLineStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '4px',
};

const creditTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
};

const insufficientStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#ef4444',
  fontWeight: 600,
};

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    marginTop: 'auto',
    width: '100%',
    padding: '8px 0',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    background: disabled ? '#94a3b8' : '#1e293b',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.3s ease, transform 0.1s ease',
  };
}

const errStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '11px',
  color: '#ef4444',
};
