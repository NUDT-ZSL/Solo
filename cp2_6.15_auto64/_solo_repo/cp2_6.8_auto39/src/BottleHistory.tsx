import { useState, useEffect } from 'react';
import type { CapsuleRecord, CapsuleStatus } from './types';

interface Props {
  records: CapsuleRecord[];
}

function BottleHistory({ records }: Props) {
  const [statuses, setStatuses] = useState<Map<string, CapsuleStatus>>(
    new Map()
  );
  const [now, setNow] = useState(Date.now());
  const [expandedReply, setExpandedReply] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStatuses = async () => {
      const newStatuses = new Map<string, CapsuleStatus>();
      for (const record of records) {
        try {
          const response = await fetch(`/api/capsules/${record.id}`);
          if (response.ok) {
            const data: CapsuleStatus = await response.json();
            newStatuses.set(record.id, data);
          }
        } catch {
          // 忽略错误
        }
      }
      setStatuses(newStatuses);
    };

    if (records.length > 0) {
      fetchStatuses();
      const interval = setInterval(fetchStatuses, 10000);
      return () => clearInterval(interval);
    }
  }, [records]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
      2,
      '0'
    )}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const getCountdown = (releaseAt: number) => {
    const diff = releaseAt - now;
    if (diff <= 0) {
      return '已释放';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}天 ${String(hours).padStart(2, '0')}:${String(
        minutes
      ).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}:${String(seconds).padStart(2, '0')}`;
  };

  const getStatusInfo = (record: CapsuleRecord) => {
    const status = statuses.get(record.id);
    if (status?.hasReply) {
      return {
        color: '#DAA520',
        label: '有新回复',
        pulse: true,
        canView: true,
        opened: false,
      };
    }
    if (status?.isOpened) {
      return {
        color: '#808080',
        label: '已漂向远方',
        pulse: false,
        canView: false,
        opened: true,
      };
    }
    return {
      color: '#4CAF50',
      label: '漂流中',
      pulse: false,
      canView: false,
      opened: false,
    };
  };

  if (records.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>📭</div>
        <h3 style={styles.emptyTitle}>还没有投递记录</h3>
        <p style={styles.emptyDesc}>去投递第一份心情吧，让它穿越时光</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📋 我的投递</h2>
        <span style={styles.count}>{records.length} 个胶囊</span>
      </div>

      <div style={styles.list}>
        {records.map((record) => {
          const statusInfo = getStatusInfo(record);
          const status = statuses.get(record.id);
          const isExpanded = expandedReply === record.id;

          return (
            <div key={record.id} style={styles.listItem}>
              <div style={styles.statusIndicatorWrapper}>
                <div
                  style={{
                    ...styles.statusIndicator,
                    backgroundColor: statusInfo.color,
                    ...(statusInfo.pulse ? { animation: 'pulse-gold 2s infinite' } : {}),
                  }}
                />
              </div>

              <div style={styles.itemContent}>
                <div style={styles.itemMain}>
                  <div style={styles.itemRow}>
                    <span style={styles.dateLabel}>投递日期</span>
                    <span style={styles.dateValue}>
                      {formatDate(record.createdAt)}
                    </span>
                  </div>

                  <div style={styles.itemRow}>
                    <span style={styles.countdownLabel}>释放倒计时</span>
                    <span className="mono" style={styles.countdownValue}>
                      {getCountdown(record.releaseAt)}
                    </span>
                  </div>

                  <div style={styles.itemRow}>
                    <span style={styles.statusLabel}>当前状态</span>
                    <span
                      style={{
                        ...styles.statusValue,
                        color: statusInfo.color,
                      }}
                    >
                      {statusInfo.label}
                      {statusInfo.pulse && ' ✨'}
                    </span>
                  </div>
                </div>

                {statusInfo.opened && (
                  <div style={styles.openedPlaceholder}>
                    <span style={styles.openedText}>🌊 已漂向远方</span>
                    <span style={styles.openedSubtext}>
                      内容已被陌生人拆阅，不可再次查看
                    </span>
                  </div>
                )}

                {statusInfo.canView && status?.hasReply && (
                  <div>
                    <button
                      onClick={() =>
                        setExpandedReply(isExpanded ? null : record.id)
                      }
                      style={styles.viewReplyButton}
                    >
                      {isExpanded ? '收起回复' : '📨 查看匿名回复'}
                    </button>

                    {isExpanded && status.reply && (
                      <div style={styles.replyCard}>
                        <div style={styles.replyHeader}>
                          <span style={styles.replyFrom}>匿名陌生人的回复</span>
                          {status.replyAt && (
                            <span style={styles.replyTime}>
                              {formatDate(status.replyAt)}
                            </span>
                          )}
                        </div>
                        <div style={styles.replyContent}>{status.reply}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '0 4px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#F5E6CC',
  },
  count: {
    fontSize: '13px',
    color: '#A8B8CC',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  listItem: {
    display: 'flex',
    gap: '16px',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '14px',
    padding: '18px',
    border: '1px solid rgba(245, 230, 204, 0.1)',
  },
  statusIndicatorWrapper: {
    paddingTop: '4px',
  },
  statusIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: '13px',
    color: '#6B7C93',
  },
  dateValue: {
    fontSize: '13px',
    color: '#F5E6CC',
    fontWeight: 500,
  },
  countdownLabel: {
    fontSize: '13px',
    color: '#6B7C93',
  },
  countdownValue: {
    fontSize: '13px',
    color: '#F5E6CC',
    fontWeight: 500,
    letterSpacing: '0.5px',
  },
  statusLabel: {
    fontSize: '13px',
    color: '#6B7C93',
  },
  statusValue: {
    fontSize: '13px',
    fontWeight: 600,
  },
  openedPlaceholder: {
    marginTop: '14px',
    padding: '14px',
    background: 'rgba(128, 128, 128, 0.1)',
    borderRadius: '10px',
    textAlign: 'center',
  },
  openedText: {
    display: 'block',
    fontSize: '14px',
    color: '#A8B8CC',
    marginBottom: '4px',
  },
  openedSubtext: {
    display: 'block',
    fontSize: '12px',
    color: '#6B7C93',
  },
  viewReplyButton: {
    marginTop: '14px',
    padding: '10px 20px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #DAA520 0%, #B8860B 100%)',
    color: '#1A2A44',
    fontSize: '13px',
    fontWeight: 600,
  },
  replyCard: {
    marginTop: '12px',
    padding: '16px',
    background: 'rgba(218, 165, 32, 0.1)',
    borderRadius: '10px',
    border: '1px solid rgba(218, 165, 32, 0.2)',
    animation: 'fadeIn 0.3s ease',
  },
  replyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  replyFrom: {
    fontSize: '12px',
    color: '#DAA520',
    fontWeight: 500,
  },
  replyTime: {
    fontSize: '12px',
    color: '#8B7355',
  },
  replyContent: {
    fontSize: '14px',
    lineHeight: 1.8,
    color: '#F5E6CC',
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#F5E6CC',
    marginBottom: '8px',
  },
  emptyDesc: {
    fontSize: '14px',
    color: '#A8B8CC',
  },
};

export default BottleHistory;
