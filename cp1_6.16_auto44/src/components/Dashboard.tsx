import React, { useEffect, useState } from 'react';
import type { PortfolioItem, Client } from '../api/dataService';

interface DashboardProps {
  portfolio: PortfolioItem[];
  clients: Client[];
}

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: string;
}

const AnimatedNumber: React.FC<{ value: number; duration?: number; prefix?: string; suffix?: string }> = ({
  value,
  duration = 1500,
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span style={{ animation: 'countUp 0.6s ease-out forwards' }}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};

const StatCard: React.FC<StatCardProps> = ({ title, value, prefix, suffix, icon }) => {
  return (
    <div
      style={{
        background: 'rgba(15, 52, 96, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(233, 69, 96, 0.2)',
        transition: 'all 0.25s ease-out',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(233, 69, 96, 0.3)';
        e.currentTarget.style.borderColor = 'rgba(233, 69, 96, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'rgba(233, 69, 96, 0.2)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{title}</span>
        <span style={{ fontSize: '28px' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--accent)', lineHeight: 1.2 }}>
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ portfolio, clients }) => {
  const totalWorks = portfolio.length;
  const totalRevenue = portfolio.reduce((sum, item) => {
    return sum + item.authorizations.reduce((s, auth) => s + auth.fee, 0);
  }, 0);
  const activeClients = clients.length;

  const recentAuthorizations = portfolio
    .flatMap(item =>
      item.authorizations.map(auth => ({
        ...auth,
        workTitle: item.title,
        workId: item.id,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const typeDistribution = portfolio.reduce((acc, item) => {
    acc[item.authorizationType] = (acc[item.authorizationType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-primary)' }}>
        数据概览
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard title="总作品数" value={totalWorks} icon="📸" />
        <StatCard title="总授权收入" value={totalRevenue} prefix="¥" icon="💰" />
        <StatCard title="活跃客户数" value={activeClients} icon="👥" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-primary)' }}>
            最近授权记录
          </h2>
          {recentAuthorizations.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
              暂无授权记录
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentAuthorizations.map((auth, index) => (
                <div
                  key={`${auth.workId}-${auth.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: 'rgba(26, 26, 46, 0.6)',
                    borderRadius: '12px',
                    transition: 'all 0.25s ease-out',
                    animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(26, 26, 46, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(26, 26, 46, 0.6)';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {auth.workTitle}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {auth.licensee} · {auth.date}
                    </div>
                  </div>
                  <div style={{ color: 'var(--gold)', fontWeight: '600', fontSize: '18px' }}>
                    ¥{auth.fee.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-primary)' }}>
            授权类型分布
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { type: 'exclusive', label: '独家', color: 'var(--exclusive)' },
              { type: 'non-exclusive', label: '非独家', color: 'var(--non-exclusive)' },
              { type: 'buyout', label: '买断', color: 'var(--buyout)' },
            ].map((item) => {
              const count = typeDistribution[item.type] || 0;
              const percentage = totalWorks > 0 ? (count / totalWorks) * 100 : 0;
              return (
                <div key={item.type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{item.label}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{count} 件 ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        background: item.color,
                        width: `${percentage}%`,
                        borderRadius: '4px',
                        transition: 'width 1s ease-out',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
