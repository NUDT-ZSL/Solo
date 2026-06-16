import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { getUser } from '../api/borrowApi';
import type { BorrowRecordWithDevice } from '../types';
import './Profile.css';

const statusConfig = {
  borrowing: { label: '未归还', className: 'status-borrowing' },
  returned_on_time: { label: '按时归还', className: 'status-returned' },
  overdue_returned: { label: '超时归还', className: 'status-overdue' },
};

function CreditScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="credit-ring-container">
      <svg className="credit-ring" width="100" height="100" viewBox="0 0 100 100">
        <circle
          className="ring-bg"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          className="ring-progress"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="credit-score-text">
        <span className="score-value">{score}</span>
        <span className="score-label">信用分</span>
      </div>
    </div>
  );
}

export function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<BorrowRecordWithDevice[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      if (user) {
        setLoadingRecords(true);
        try {
          const userData = await getUser(user.id);
          setRecords(userData.borrowRecords || []);
        } catch (err) {
          console.error('获取借用记录失败', err);
        } finally {
          setLoadingRecords(false);
        }
      }
    };

    fetchRecords();
  }, [user]);

  if (authLoading) {
    return <div className="profile-page"><div className="loading-state">加载中...</div></div>;
  }

  if (!user) {
    return <div className="profile-page"><div className="error-state">请先登录</div></div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-info">
          <img src={user.avatar} alt={user.name} className="profile-avatar" />
          <div className="profile-details">
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-role">
              {user.role === 'admin' ? '管理员' : '普通用户'}
            </p>
          </div>
        </div>
        <CreditScoreRing score={user.creditScore} />
      </div>

      <div className="records-section">
        <h2>借用历史</h2>
        {loadingRecords ? (
          <div className="loading-state">加载记录中...</div>
        ) : records.length > 0 ? (
          <div className="records-table-container">
            <table className="records-table">
              <thead>
                <tr>
                  <th>设备名称</th>
                  <th>借用时间</th>
                  <th>归还时间</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => {
                  const status = statusConfig[record.status];
                  return (
                    <tr key={record.id}>
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
