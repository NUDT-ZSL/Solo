import { useEffect, useState } from 'react';
import { useUser } from '../hooks/useUser';
import { useRecords } from '../hooks/useRecords';
import { useBorrow } from '../hooks/useBorrow';
import { getDevice, getUser } from '../api/borrowApi';
import { Device, User } from '../types';

const statusConfig = {
  returned_on_time: { text: '按时归还', color: '#22c55e' },
  returned_overdue: { text: '超时归还', color: '#eab308' },
  not_returned: { text: '未归还', color: '#ef4444' },
};

export function Admin() {
  const { data: user, loading: userLoading, error: userError } = useUser('user-1');
  const { data: records, loading: recordsLoading, refetch: refetchRecords } = useRecords();
  const { returnDevice, loading: returnLoading } = useBorrow();

  const [devices, setDevices] = useState<Record<string, Device>>({});
  const [users, setUsers] = useState<Record<string, User>>({});

  useEffect(() => {
    records?.forEach((record) => {
      if (!devices[record.deviceId]) {
        getDevice(record.deviceId).then((d) => {
          setDevices((prev) => ({ ...prev, [record.deviceId]: d }));
        }).catch(() => {});
      }
      if (!users[record.userId]) {
        getUser(record.userId).then((u) => {
          setUsers((prev) => ({ ...prev, [record.userId]: u }));
        }).catch(() => {});
      }
    });
  }, [records]);

  const handleReturn = async (recordId: string) => {
    try {
      await returnDevice(recordId);
      refetchRecords();
    } catch {
    }
  };

  if (userLoading || recordsLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '16px',
        color: '#6b7280',
      }}>
        加载中...
      </div>
    );
  }

  if (userError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '16px',
        color: '#ef4444',
      }}>
        错误: {userError}
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '20px',
        fontWeight: 600,
        color: '#ef4444',
      }}>
        无权限访问
      </div>
    );
  }

  const sortedRecords = records
    ? [...records].sort((a, b) => new Date(b.borrowTime).getTime() - new Date(a.borrowTime).getTime())
    : [];

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '32px 24px',
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          margin: 0,
          marginBottom: '8px',
          fontSize: '28px',
          fontWeight: 700,
          color: '#1f2937',
        }}>
          管理后台
        </h1>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#6b7280',
        }}>
          查看和管理所有借用记录
        </p>
      </div>

      <div style={{
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}>
        <h2 style={{
          margin: 0,
          marginBottom: '16px',
          fontSize: '18px',
          fontWeight: 600,
          color: '#1f2937',
        }}>
          所有借用记录
        </h2>
        {sortedRecords.length === 0 ? (
          <div style={{
            padding: '32px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#6b7280',
          }}>
            暂无借用记录
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                  }}>设备名称</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                  }}>用户名</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                  }}>借用时间</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                  }}>状态</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                  }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record) => {
                  const device = devices[record.deviceId];
                  const recordUser = users[record.userId];
                  const status = statusConfig[record.status];
                  const canReturn = record.status === 'not_returned';
                  return (
                    <tr key={record.id} style={{
                      borderBottom: '1px solid #f3f4f6',
                    }}>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: '#1f2937',
                      }}>
                        {device ? device.name : '加载中...'}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: '#1f2937',
                      }}>
                        {recordUser ? recordUser.name : '加载中...'}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: '#6b7280',
                      }}>
                        {new Date(record.borrowTime).toLocaleString('zh-CN')}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                      }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#ffffff',
                          backgroundColor: status.color,
                        }}>
                          {status.text}
                        </span>
                      </td>
                      <td style={{
                        padding: '12px 16px',
                      }}>
                        {canReturn ? (
                          <button
                            onClick={() => handleReturn(record.id)}
                            disabled={returnLoading}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: returnLoading ? '#93c5fd' : '#3b82f6',
                              color: '#ffffff',
                              fontSize: '13px',
                              fontWeight: 500,
                              cursor: returnLoading ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {returnLoading ? '处理中...' : '标记归还'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
