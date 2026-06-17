import { useUser } from '../hooks/useUser';
import { useRecords } from '../hooks/useRecords';
import { getDevice } from '../api/borrowApi';
import { useState, useEffect } from 'react';
import { Device } from '../types';

const statusConfig = {
  returned_on_time: { text: '按时归还', color: '#22c55e' },
  returned_overdue: { text: '超时归还', color: '#eab308' },
  not_returned: { text: '未归还', color: '#ef4444' },
};

export function Profile() {
  const { data: user, loading: userLoading, error: userError } = useUser('user-1');
  const { data: records, loading: recordsLoading } = useRecords();
  const [devices, setDevices] = useState<Record<string, Device>>({});

  const userRecords = records
    ?.filter((r) => r.userId === 'user-1')
    .sort((a, b) => new Date(b.borrowTime).getTime() - new Date(a.borrowTime).getTime()) || [];

  useEffect(() => {
    userRecords.forEach((record) => {
      if (!devices[record.deviceId]) {
        getDevice(record.deviceId).then((d) => {
          setDevices((prev) => ({ ...prev, [record.deviceId]: d }));
        }).catch(() => {});
      }
    });
  }, [userRecords]);

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

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '16px',
        color: '#6b7280',
      }}>
        用户不存在
      </div>
    );
  }

  const getGradientColor = (score: number) => {
    const ratio = score / 100;
    const r = Math.round(239 + (34 - 239) * ratio);
    const g = Math.round(68 + (197 - 68) * ratio);
    const b = Math.round(68 + (94 - 68) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '32px 24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '32px',
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}>
        <img
          src={user.avatar}
          alt={user.name}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '2px solid #e5e7eb',
            objectFit: 'cover',
          }}
        />
        <div style={{ flex: 1 }}>
          <h1 style={{
            margin: 0,
            marginBottom: '4px',
            fontSize: '24px',
            fontWeight: 700,
            color: '#1f2937',
          }}>
            {user.name}
          </h1>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#6b7280',
          }}>
            {user.isAdmin ? '管理员' : '普通用户'}
          </p>
        </div>
      </div>

      <div style={{
        marginBottom: '32px',
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: '#1f2937',
          }}>
            信用评分
          </h2>
          <span style={{
            fontSize: '24px',
            fontWeight: 700,
            color: getGradientColor(user.creditScore),
          }}>
            {user.creditScore} / 100
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '12px',
          backgroundColor: '#e5e7eb',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}>
          <div
            style={{
              height: '100%',
              width: `${user.creditScore}%`,
              background: `linear-gradient(to right, #ef4444, #eab308, #22c55e)`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
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
          借用历史
        </h2>
        {userRecords.length === 0 ? (
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
                }}>借用时间</th>
                <th style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                }}>归还时间</th>
                <th style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {userRecords.map((record) => {
                const device = devices[record.deviceId];
                const status = statusConfig[record.status];
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
                      color: '#6b7280',
                    }}>
                      {new Date(record.borrowTime).toLocaleString('zh-CN')}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#6b7280',
                    }}>
                      {record.returnTime ? new Date(record.returnTime).toLocaleString('zh-CN') : '-'}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
