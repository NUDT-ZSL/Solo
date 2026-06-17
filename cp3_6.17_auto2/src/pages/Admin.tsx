import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { BorrowRecord } from '../types';
import { getAllRecords, confirmReturn } from '../api/borrowApi';
import { RecordStatusTag } from '../components/StatusBadge';

/* Admin.tsx - 管理面板页
   调用关系：路由 /admin，由 App.tsx 渲染
   数据流：getAllRecords → 展示所有记录 → 标记归还调用 confirmReturn
*/

export function Admin() {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getAllRecords()
      .then(setRecords)
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleReturn = async (recordId: string) => {
    setProcessing(recordId);
    try {
      await confirmReturn(recordId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '归还失败');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div style={centerStyle}>加载记录中…</div>;

  return (
    <div style={wrapStyle}>
      <h2 style={h2Style}>管理面板 · 全部借用记录</h2>
      {error && <div style={errBannerStyle}>{error}</div>}
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>记录ID</th>
              <th style={thStyle}>设备</th>
              <th style={thStyle}>借用人</th>
              <th style={thStyle}>借用时间</th>
              <th style={thStyle}>归还时间</th>
              <th style={thStyle}>状态</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{r.id}</td>
                <td style={tdStyle}>{r.deviceName}</td>
                <td style={tdStyle}>{r.userName}</td>
                <td style={tdStyle}>{dayjs(r.borrowTime).format('YYYY-MM-DD HH:mm')}</td>
                <td style={tdStyle}>
                  {r.returnTime ? dayjs(r.returnTime).format('YYYY-MM-DD HH:mm') : '—'}
                </td>
                <td style={tdStyle}>
                  <RecordStatusTag status={r.status} />
                </td>
                <td style={tdStyle}>
                  {r.status === 'ongoing' ? (
                    <button
                      style={actionBtn(processing === r.id)}
                      disabled={processing === r.id}
                      onClick={() => handleReturn(r.id)}
                    >
                      {processing === r.id ? '处理中…' : '确认归还'}
                    </button>
                  ) : (
                    <span style={doneStyle}>已完成</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '24px',
};

const h2Style: React.CSSProperties = {
  margin: '0 0 24px',
  fontSize: '22px',
  color: '#1e293b',
};

const errBannerStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#fee2e2',
  color: '#dc2626',
  borderRadius: '8px',
  marginBottom: '16px',
  fontSize: '13px',
};

const tableWrapStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  overflowX: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: '760px',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: '13px',
  color: '#64748b',
  background: '#f8fafc',
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '13px',
  color: '#1e293b',
  borderBottom: '1px solid #f1f5f9',
  whiteSpace: 'nowrap',
};

function actionBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '5px 14px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    background: disabled ? '#94a3b8' : '#1e293b',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.3s ease',
  };
}

const doneStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
};

const centerStyle: React.CSSProperties = {
  padding: '60px',
  textAlign: 'center',
  color: '#64748b',
};
