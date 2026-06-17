import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { User } from '../types';
import { getUserById } from '../api/borrowApi';
import { RecordStatusTag } from '../components/StatusBadge';

/* Profile.tsx - 用户档案页
   调用关系：路由 /profile，由 App.tsx 渲染
   数据流：getUserById → 头像/信用进度条/借用历史表格
   信用分进度条：0-100，颜色从 #ef4444 渐变到 #22c55e
*/

const CURRENT_USER_ID = 'u-001';

export function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getUserById(CURRENT_USER_ID)
      .then((u) => {
        if (active) setUser(u);
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
  }, []);

  if (loading) return <div style={centerStyle}>加载档案中…</div>;
  if (error || !user) return <div style={centerStyle}>错误：{error || '用户不存在'}</div>;

  const score = user.creditScore;
  const percent = Math.max(0, Math.min(100, score));
  const barColor = `linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)`;
  const ringColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  const C = 2 * Math.PI * 28;

  return (
    <div style={wrapStyle}>
      <h2 style={h2Style}>我的档案</h2>

      <div style={cardStyle}>
        <div style={leftStyle}>
          <img src={user.avatar} alt={user.name} style={avatarStyle} />
          <div>
            <h3 style={nameStyle}>{user.name}</h3>
            <span style={roleStyle}>{user.role === 'admin' ? '管理员' : '普通用户'}</span>
          </div>
        </div>

        <div style={creditBoxStyle}>
          <div style={scoreCircleStyle}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke={ringColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - percent / 100)}
                transform="rotate(-90 32 32)"
                style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
              />
            </svg>
            <span style={scoreTextStyle}>{score}</span>
          </div>
          <div style={barWrapStyle}>
            <div style={barTrackStyle}>
              <div
                style={{
                  ...barFillStyle,
                  width: `${percent}%`,
                  background: barColor,
                }}
              />
            </div>
            <div style={scoreLegendStyle}>
              <span>0</span>
              <span>信用评分 {score}/100</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>

      <h3 style={h3Style}>借用历史</h3>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>设备名称</th>
              <th style={thStyle}>借用时间</th>
              <th style={thStyle}>归还时间</th>
              <th style={thStyle}>状态</th>
            </tr>
          </thead>
          <tbody>
            {user.records && user.records.length > 0 ? (
              user.records.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.deviceName}</td>
                  <td style={tdStyle}>{dayjs(r.borrowTime).format('YYYY-MM-DD HH:mm')}</td>
                  <td style={tdStyle}>
                    {r.returnTime ? dayjs(r.returnTime).format('YYYY-MM-DD HH:mm') : '—'}
                  </td>
                  <td style={tdStyle}>
                    <RecordStatusTag status={r.status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={tdStyle} colSpan={4}>
                  暂无借用记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '24px',
};

const h2Style: React.CSSProperties = {
  margin: '0 0 24px',
  fontSize: '22px',
  color: '#1e293b',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  display: 'flex',
  alignItems: 'center',
  gap: '32px',
  flexWrap: 'wrap',
};

const leftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const avatarStyle: React.CSSProperties = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  border: '2px solid #e5e7eb',
  objectFit: 'cover',
};

const nameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '18px',
  color: '#1e293b',
};

const roleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
};

const creditBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  flex: 1,
  minWidth: '260px',
};

const scoreCircleStyle: React.CSSProperties = {
  position: 'relative',
  width: '64px',
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const scoreTextStyle: React.CSSProperties = {
  position: 'absolute',
  fontSize: '16px',
  fontWeight: 700,
  color: '#1e293b',
};

const barWrapStyle: React.CSSProperties = {
  flex: 1,
};

const barTrackStyle: React.CSSProperties = {
  height: '10px',
  background: '#f1f5f9',
  borderRadius: '999px',
  overflow: 'hidden',
};

const barFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  transition: 'width 0.6s ease-out',
};

const scoreLegendStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '6px',
  fontSize: '12px',
  color: '#64748b',
};

const h3Style: React.CSSProperties = {
  margin: '24px 0 12px',
  fontSize: '16px',
  color: '#1e293b',
};

const tableWrapStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: '13px',
  color: '#64748b',
  background: '#f8fafc',
  borderBottom: '1px solid #e5e7eb',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '13px',
  color: '#1e293b',
  borderBottom: '1px solid #f1f5f9',
};

const centerStyle: React.CSSProperties = {
  padding: '60px',
  textAlign: 'center',
  color: '#64748b',
};
