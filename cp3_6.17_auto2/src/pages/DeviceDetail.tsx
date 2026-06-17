import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Device, User } from '../types';
import { getDeviceById, getUserById, submitBorrow } from '../api/borrowApi';
import { StatusBadge } from '../components/StatusBadge';
import { QRModal } from '../components/QRModal';

/* DeviceDetail.tsx - 设备详情页
   调用关系：路由 /device/:id，由 App.tsx 渲染
   数据流：getDeviceById + getUserById → 展示大图/参数/历史 → 借用按钮调用 submitBorrow
*/

const CURRENT_USER_ID = 'u-001';

export function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrRecordId, setQrRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    Promise.all([getDeviceById(id), getUserById(CURRENT_USER_ID)])
      .then(([d, u]) => {
        if (!active) return;
        setDevice(d);
        setUser(u);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : '加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div style={centerStyle}>加载设备详情…</div>;
  if (error || !device || !user) return <div style={centerStyle}>错误：{error || '设备不存在'}</div>;

  const isIdle = device.status === 'idle';
  const creditOk = user.creditScore >= device.minCreditScore;
  const disabled = !isIdle || !creditOk;

  const handleBorrow = async () => {
    if (disabled || borrowing) return;
    setBorrowing(true);
    setError(null);
    try {
      const result = await submitBorrow(device.id, CURRENT_USER_ID);
      setQrRecordId(result.record.id);
      setDevice(result.device);
    } catch (e) {
      setError(e instanceof Error ? e.message : '借用失败');
    } finally {
      setBorrowing(false);
    }
  };

  return (
    <div style={wrapStyle}>
      <Link to="/overview" style={backStyle}>← 返回总览</Link>
      <div style={detailGridStyle}>
        <div>
          <img src={device.imageUrl} alt={device.name} style={bigImgStyle} />
          <div style={statusRowStyle}>
            <StatusBadge status={device.status} />
            <span style={creditReqStyle}>最低信用分要求：{device.minCreditScore}</span>
          </div>
        </div>
        <div>
          <span style={typeTagStyle}>{device.type}</span>
          <h1 style={h1Style}>{device.name}</h1>
          <h3 style={h3Style}>技术参数</h3>
          <table style={tableStyle}>
            <tbody>
              {device.specs.map((s) => (
                <tr key={s.label}>
                  <td style={tdLabelStyle}>{s.label}</td>
                  <td style={tdValueStyle}>{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={h3Style}>历史借用记录</h3>
          {device.history && device.history.length > 0 ? (
            <ul style={listStyle}>
              {device.history.map((r) => (
                <li key={r.id} style={listItemStyle}>
                  <span style={avatarMiniStyle}>{r.userName.slice(0, 1)}</span>
                  <span style={liTextStyle}>
                    {r.userName} · {dayjs(r.borrowTime).format('YYYY-MM-DD HH:mm')} →{' '}
                    {r.returnTime ? dayjs(r.returnTime).format('MM-DD HH:mm') : '未归还'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={emptyStyle}>暂无历史记录</p>
          )}
        </div>
      </div>

      <div style={bottomBarStyle}>
        {!creditOk && isIdle && (
          <span style={insufficientStyle}>⚠ 信用分不足，需达到 {device.minCreditScore} 分</span>
        )}
        <button style={borrowBtn(disabled)} disabled={disabled} onClick={handleBorrow}>
          {borrowing ? '处理中…' : isIdle ? (creditOk ? '立即借用' : '信用不足') : '设备不可借'}
        </button>
        {error && <span style={insufficientStyle}>{error}</span>}
      </div>

      {qrRecordId && (
        <QRModal
          recordId={qrRecordId}
          deviceName={device.name}
          onClose={() => {
            setQrRecordId(null);
            navigate('/profile');
          }}
        />
      )}
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '24px',
};

const backStyle: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '16px',
  color: '#3b82f6',
  textDecoration: 'none',
  fontSize: '14px',
};

const detailGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '32px',
};

const bigImgStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  borderRadius: '8px',
  objectFit: 'cover',
  background: '#f1f5f9',
};

const statusRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginTop: '12px',
};

const creditReqStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#64748b',
};

const typeTagStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '12px',
  color: '#475569',
  background: '#f1f5f9',
  padding: '2px 10px',
  borderRadius: '6px',
};

const h1Style: React.CSSProperties = {
  margin: '8px 0 16px',
  fontSize: '24px',
  color: '#1e293b',
};

const h3Style: React.CSSProperties = {
  margin: '16px 0 8px',
  fontSize: '16px',
  color: '#1e293b',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const tdLabelStyle: React.CSSProperties = {
  padding: '6px 0',
  fontSize: '13px',
  color: '#64748b',
  borderBottom: '1px solid #f1f5f9',
  width: '40%',
};

const tdValueStyle: React.CSSProperties = {
  padding: '6px 0',
  fontSize: '13px',
  color: '#1e293b',
  borderBottom: '1px solid #f1f5f9',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const listItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const avatarMiniStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  background: '#1e293b',
  color: '#fff',
  fontSize: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const liTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#475569',
};

const emptyStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#94a3b8',
};

const bottomBarStyle: React.CSSProperties = {
  marginTop: '32px',
  padding: '16px',
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

function borrowBtn(disabled: boolean): React.CSSProperties {
  return {
    marginLeft: 'auto',
    padding: '10px 32px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    background: disabled ? '#94a3b8' : '#1e293b',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.3s ease',
  };
}

const insufficientStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#ef4444',
  fontWeight: 500,
};

const centerStyle: React.CSSProperties = {
  padding: '60px',
  textAlign: 'center',
  color: '#64748b',
};
