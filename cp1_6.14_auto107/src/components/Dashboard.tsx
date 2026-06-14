import React, { useState, useEffect } from 'react';
import { statsApi } from '../http';
import type { Customer, Stats } from '../types';

interface DashboardProps {
  period: 'week' | 'month';
  onPeriodChange: (period: 'week' | 'month') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ period, onPeriodChange }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const startTime = performance.now();

    statsApi
      .get(period)
      .then((data) => {
        const elapsed = performance.now() - startTime;
        const delay = Math.max(0, 300 - elapsed);
        setTimeout(() => {
          setStats(data);
          setLoading(false);
        }, delay);
      })
      .catch(() => setLoading(false));
  }, [period]);

  const maxPoints = stats?.topCustomers[0]?.points || 1;

  const getRankGradient = (index: number, total: number) => {
    const ratio = index / Math.max(total - 1, 1);
    const r1 = 231,
      g1 = 76,
      b1 = 60;
    const r2 = 46,
      g2 = 204,
      b2 = 113;
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div style={styles.dashboard}>
      <div style={styles.header}>
        <h2 style={styles.title}>数据概览</h2>
        <div style={styles.periodTabs}>
          <button
            style={{
              ...styles.periodTab,
              ...(period === 'week' ? styles.periodTabActive : {}),
            }}
            onClick={() => onPeriodChange('week')}
          >
            本周
          </button>
          <button
            style={{
              ...styles.periodTab,
              ...(period === 'month' ? styles.periodTabActive : {}),
            }}
            onClick={() => onPeriodChange('month')}
          >
            本月
          </button>
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats?.issuedCoupons || 0}</div>
          <div style={styles.statLabel}>已发放优惠券</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats?.redeemedCoupons || 0}</div>
          <div style={styles.statLabel}>已兑换优惠券</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats?.activeCoupons || 0}</div>
          <div style={styles.statLabel}>有效优惠券</div>
        </div>
      </div>

      <div style={styles.rankSection}>
        <h3 style={styles.rankTitle}>积分排行榜 TOP 10</h3>
        <div style={styles.rankList}>
          {loading ? (
            <div style={styles.loading}>加载中...</div>
          ) : (
            stats?.topCustomers.map((customer: Customer, index: number) => (
              <div key={customer.id} style={styles.rankItem}>
                <div style={styles.rankIndex}>
                  <span
                    style={{
                      ...styles.rankBadge,
                      ...(index < 3 ? styles.rankBadgeTop : {}),
                      backgroundColor:
                        index < 3
                          ? ['#e74c3c', '#e67e22', '#f1c40f'][index]
                          : 'transparent',
                      color: index < 3 ? '#fff' : 'var(--text-color)',
                    }}
                  >
                    {index + 1}
                  </span>
                </div>
                <div style={styles.rankInfo}>
                  <div style={styles.rankName}>{customer.name}</div>
                  <div style={styles.rankPoints}>{customer.points} 积分</div>
                </div>
                <div style={styles.rankBarContainer}>
                  <div
                    style={{
                      ...styles.rankBar,
                      width: `${(customer.points / maxPoints) * 100}%`,
                      backgroundColor: getRankGradient(
                        index,
                        stats.topCustomers.length
                      ),
                      transition: 'width 0.6s ease-out, background-color 0.6s ease-out',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  dashboard: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-color)',
  },
  periodTabs: {
    display: 'flex',
    gap: '8px',
  },
  periodTab: {
    padding: '6px 16px',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: 'var(--text-color)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--coupon-border)',
    transition: 'all 0.2s ease',
  },
  periodTabActive: {
    backgroundColor: 'var(--primary-color)',
    color: '#fff',
    borderColor: 'var(--primary-color)',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '28px',
  },
  statCard: {
    backgroundColor: 'var(--bg-color)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    textAlign: 'center',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  statNumber: {
    fontSize: '60px',
    fontWeight: 700,
    color: 'var(--primary-color)',
    lineHeight: 1.1,
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '16px',
    color: 'var(--text-color)',
    opacity: 0.7,
  },
  rankSection: {},
  rankTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
  },
  rankList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  rankItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  rankIndex: {
    width: '28px',
    flexShrink: 0,
  },
  rankBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    fontSize: '12px',
    fontWeight: 600,
  },
  rankBadgeTop: {
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  rankInfo: {
    width: '100px',
    flexShrink: 0,
  },
  rankName: {
    fontSize: '14px',
    fontWeight: 500,
  },
  rankPoints: {
    fontSize: '12px',
    color: 'var(--text-color)',
    opacity: 0.6,
  },
  rankBarContainer: {
    flex: 1,
    height: '40px',
    backgroundColor: 'var(--bg-color)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
  },
  rankBar: {
    height: '100%',
    borderRadius: 'var(--radius-sm)',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: 'var(--text-color)',
    opacity: 0.5,
  },
};

export default Dashboard;
