import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useBorrow } from '@/hooks/useBorrow';
import { getUserById } from '@/api/borrowApi';
import { RECORD_STATUS_LABELS, RECORD_STATUS_COLORS } from '@/types';
import type { BorrowRecordWithDetails } from '@/types';
import { Loader2, Shield, CheckCircle } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

const Admin = () => {
  const { records, devices, fetchRecords, fetchDevices, returnDevice } = useBorrow();
  const [recordsWithDetails, setRecordsWithDetails] = useState<BorrowRecordWithDetails[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingReturn, setLoadingReturn] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchDevices();
  }, [fetchRecords, fetchDevices]);

  useEffect(() => {
    const loadUserDetails = async () => {
      if (records.data && devices.data) {
        const recordsWithNames = await Promise.all(
          records.data.map(async (record) => {
            const deviceName = devices.data?.find((d) => d.id === record.deviceId)?.name || '未知设备';
            const userResponse = await getUserById(record.userId);
            const userName = userResponse.success && userResponse.data ? userResponse.data.name : '未知用户';
            const userInitial = userName.charAt(0).toUpperCase();
            return {
              ...record,
              deviceName,
              userName,
              userInitial,
            };
          })
        );
        recordsWithNames.sort((a, b) => dayjs(b.borrowTime).valueOf() - dayjs(a.borrowTime).valueOf());
        setRecordsWithDetails(recordsWithNames);
      }
    };
    loadUserDetails();
  }, [records.data, devices.data]);

  const handleReturn = (recordId: string) => {
    setSelectedRecord(recordId);
    setShowConfirm(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedRecord) return;
    setLoadingReturn(true);
    const result = await returnDevice(selectedRecord);
    setLoadingReturn(false);
    setShowConfirm(false);
    setSelectedRecord(null);
    if (result.success) {
      fetchRecords();
    }
  };

  if (records.loading || devices.loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)', backgroundColor: '#f8fafc' }}>
        <Loader2 size={32} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={28} style={{ color: '#3b82f6' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
              管理面板
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              查看所有借用记录，标记设备归还
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '20px' }}>
            所有借用记录
          </h2>

          {recordsWithDetails.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '40px' }}>暂无记录</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      用户
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      设备
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      借用时间
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      预计归还
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      实际归还
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      状态
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recordsWithDetails.map((record, index) => (
                    <tr key={record.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: '#3b82f6',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            {record.userInitial}
                          </div>
                          <span style={{ fontSize: '14px', color: '#1e293b' }}>{record.userName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>
                        {record.deviceName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                        {dayjs(record.borrowTime).format('YYYY-MM-DD HH:mm')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                        {dayjs(record.expectedReturnTime).format('YYYY-MM-DD HH:mm')}
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
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                        {record.status === 'borrowing' ? (
                          <button
                            onClick={() => handleReturn(record.id)}
                            disabled={loadingReturn && selectedRecord === record.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#22c55e',
                              color: '#ffffff',
                              fontSize: '13px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#16a34a';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#22c55e';
                            }}
                          >
                            <CheckCircle size={14} />
                            {loadingReturn && selectedRecord === record.id ? '处理中...' : '标记归还'}
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="确认归还"
        message="确定要标记此设备已归还吗？系统将自动计算是否超时并更新用户信用分。"
        onConfirm={handleConfirmReturn}
        onCancel={() => { setShowConfirm(false); setSelectedRecord(null); }}
        confirmText="确认归还"
        cancelText="取消"
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Admin;
