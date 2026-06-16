import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getAllRecords, confirmReturn } from '../api/borrowApi';
import { useAuth } from '../context/AuthContext';
import type { BorrowRecordWithInfo } from '../types';
import './Admin.css';

const statusConfig = {
  borrowing: { label: '未归还', className: 'status-borrowing' },
  returned_on_time: { label: '按时归还', className: 'status-returned' },
  overdue_returned: { label: '超时归还', className: 'status-overdue' },
};

export function Admin() {
  const { user } = useAuth();
  const [records, setRecords] = useState<BorrowRecordWithInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await getAllRecords();
      setRecords(data.sort((a, b) => 
        new Date(b.borrowTime).getTime() - new Date(a.borrowTime).getTime()
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleReturn = async (recordId: string) => {
    if (!confirm('确认标记该设备已归还？')) return;
    
    setReturningId(recordId);
    try {
      await confirmReturn(recordId);
      await fetchRecords();
    } catch (err) {
      alert(err instanceof Error ? err.message : '归还失败');
    } finally {
      setReturningId(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-page">
        <div className="error-state">无权限访问此页面</div>
      </div>
    );
  }

  if (loading) {
    return <div className="admin-page"><div className="loading-state">加载中...</div></div>;
  }

  if (error) {
    return <div className="admin-page"><div className="error-state">{error}</div></div>;
  }

  const borrowingCount = records.filter(r => r.status === 'borrowing').length;
  const returnedOnTimeCount = records.filter(r => r.status === 'returned_on_time').length;
  const overdueCount = records.filter(r => r.status === 'overdue_returned').length;

  return (
    <div className="admin-page">
      <h1 className="page-title">管理面板</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{records.length}</div>
          <div className="stat-label">总借用记录</div>
        </div>
        <div className="stat-card borrowing">
          <div className="stat-value">{borrowingCount}</div>
          <div className="stat-label">借用中</div>
        </div>
        <div className="stat-card returned">
          <div className="stat-value">{returnedOnTimeCount}</div>
          <div className="stat-label">按时归还</div>
        </div>
        <div className="stat-card overdue">
          <div className="stat-value">{overdueCount}</div>
          <div className="stat-label">超时归还</div>
        </div>
      </div>

      <div className="records-section">
        <h2>所有借用记录</h2>
        {records.length > 0 ? (
          <div className="records-table-container">
            <table className="records-table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>设备</th>
                  <th>借用时间</th>
                  <th>归还时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => {
                  const status = statusConfig[record.status];
                  const isBorrowing = record.status === 'borrowing';
                  return (
                    <tr key={record.id}>
                      <td>{record.userName}</td>
                      <td>{record.deviceName}</td>
                      <td>{dayjs(record.borrowTime).format('YYYY-MM-DD HH:mm')}</td>
                      <td>
                        {record.returnTime
                          ? dayjs(record.returnTime).format('YYYY-MM-DD HH:mm')
                          : '-'}
                      </td>
                      <td>
                        <span className={`status-tag ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        {isBorrowing && (
                          <button
                            className="return-btn"
                            onClick={() => handleReturn(record.id)}
                            disabled={returningId === record.id}
                          >
                            {returningId === record.id ? '处理中...' : '标记归还'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-records">暂无借用记录</p>
        )}
      </div>
    </div>
  );
}
