import { useEffect } from 'react';
import dayjs from 'dayjs';
import { useBorrow } from '@/hooks/useBorrow';
import { CURRENT_USER_ID, getCreditScoreColor } from '@/utils/constants';
import { RECORD_STATUS_LABELS, RECORD_STATUS_COLORS } from '@/types';
import type { BorrowRecordWithDetails } from '@/types';
import { Loader2, Calendar, Clock } from 'lucide-react';

const Profile = () => {
  const { user, records, devices, fetchUser, fetchRecords, fetchDevices } = useBorrow();

  useEffect(() => {
    fetchUser(CURRENT_USER_ID);
    fetchRecords(CURRENT_USER_ID);
    fetchDevices();
  }, [fetchUser, fetchRecords, fetchDevices]);

  const getDeviceName = (deviceId: string) => {
    return devices.data?.find((d) => d.id === deviceId)?.name || '未知设备';
  };

  const recordsWithDetails: BorrowRecordWithDetails[] = (records.data || [])
    .map((record) => ({
      ...record,
      deviceName: getDeviceName(record.deviceId),
    }))
    .sort((a, b) => dayjs(b.borrowTime).valueOf() - dayjs(a.borrowTime).valueOf());

  const renderCircularProgress = (score: number) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = getCreditScoreColor(score);

    return (
      <div style={{ position: 'relative', width: '120px', height: '120px' }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '28px', fontWeight: 700, color }}>{score}</span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>信用分</span>
        </div>
      </div>
    );
  };

  if (user.loading || records.loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)', backgroundColor: '#f8fafc' }}>
        <Loader2 size={32} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const userData = user.data;

  if (!userData) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 60px)' }}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          用户信息加载失败
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <img
              src={userData.avatarUrl}
              alt={userData.name}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: '2px solid #e5e7eb',
                objectFit: 'cover',
              }}
            />
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                {userData.name}
              </h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                {userData.role === 'admin' ? '系统管理员' : '普通用户'}
              </p>
            </div>
            {renderCircularProgress(userData.creditScore)}
          </div>

          {userData.creditScore < 80 && (
            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
              }}
            >
              <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
                温馨提示：您的信用分低于80分，将无法借用信用分要求≥80的设备。请按时归还设备以提升信用分。
              </p>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} />
            借用历史记录
          </h2>

          {recordsWithDetails.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '40px' }}>暂无借用记录</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      设备名称
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      借用时间
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      归还时间
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recordsWithDetails.map((record, index) => (
                    <tr key={record.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>
                        {record.deviceName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                        {dayjs(record.borrowTime).format('YYYY-MM-DD HH:mm')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                        {record.actualReturnTime
                          ? dayjs(record.actualReturnTime).format('YYYY-MM-DD HH:mm')
                          : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#ffffff',
                            backgroundColor: RECORD_STATUS_COLORS[record.status],
                          }}
                        >
                          {RECORD_STATUS_LABELS[record.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Profile;
