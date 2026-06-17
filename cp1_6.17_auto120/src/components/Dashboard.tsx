import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { Campaign, TotalStats, TimeSeriesPoint, CampaignStats, updateCampaignStatus, getCampaignStats } from '../utils/api';

const customEase = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

interface DashboardProps {
  campaigns: Campaign[];
  stats: TotalStats;
  timeSeries: TimeSeriesPoint[];
  onStatusChange: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ campaigns, stats, timeSeries, onStatusChange }) => {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [selectedBar, setSelectedBar] = useState<CampaignStats | null>(null);
  const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleTogglePause = useCallback(async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await updateCampaignStatus(id, newStatus);
    onStatusChange();
  }, [onStatusChange]);

  const conversionData = campaigns.map(c => ({
    name: c.name.length > 8 ? c.name.substring(0, 8) + '...' : c.name,
    fullName: c.name,
    conversionRate: c.claimed > 0 ? parseFloat(((c.redeemed / c.claimed) * 100).toFixed(1)) : 0,
    id: c.id,
  }));

  const handleBarClick = useCallback(async (data: any, event: any) => {
    const campaign = campaigns.find(c => c.id === data.id);
    if (!campaign) return;
    try {
      const detailedStats = await getCampaignStats(campaign.id);
      setSelectedBar(detailedStats);
      if (event && event.clientX !== undefined) {
        setModalPos({ x: event.clientX, y: event.clientY });
      }
    } catch { }
  }, [campaigns]);

  const closeModal = useCallback(() => {
    setSelectedBar(null);
    setModalPos(null);
  }, []);

  const typeLabel: Record<string, string> = {
    full_reduction: '满减',
    discount: '折扣',
    fixed: '立减',
  };

  const statusColor = (status: string) => status === 'active' ? '#4CAF50' : '#FF9800';
  const statusText = (status: string) => status === 'active' ? '进行中' : '已暂停';

  const couponStatusColor = (status: string) => {
    if (status === 'unclaimed') return '#4CAF50';
    if (status === 'claimed') return '#2196F3';
    return '#FF5722';
  };

  const couponStatusText = (status: string) => {
    if (status === 'unclaimed') return '未领取';
    if (status === 'claimed') return '已领取';
    return '已核销';
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedBar && !(e.target as HTMLElement).closest('.stats-popup')) {
        closeModal();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedBar, closeModal]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const lineChartHeight = isMobile ? 200 : 400;
  const barChartHeight = isMobile ? 200 : 300;
  const statsGridCols = isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)';

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: statsGridCols, gap: '16px', marginBottom: '24px' }}>
        <StatCard label="总发放量" value={stats.totalIssued} bg="#E8F5E9" color="#4CAF50" />
        <StatCard label="总领取量" value={stats.totalClaimed} bg="#E3F2FD" color="#2196F3" />
        <StatCard label="总核销量" value={stats.totalRedeemed} bg="#FBE9E7" color="#FF5722" />
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#333' }}>领取与核销趋势</h3>
        <div ref={chartRef}>
          <ResponsiveContainer width="100%" height={lineChartHeight}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#999" />
              <YAxis tick={{ fontSize: 12 }} stroke="#999" />
              <Tooltip />
              <Line type="monotone" dataKey="claimed" stroke="#2196F3" strokeWidth={2} dot={false} animationDuration={500} animationEasing={customEase} name="领取" />
              <Line type="monotone" dataKey="redeemed" stroke="#FF5722" strokeWidth={2} dot={false} animationDuration={500} animationEasing={customEase} name="核销" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#333' }}>活动转化率对比</h3>
        <ResponsiveContainer width="100%" height={barChartHeight}>
          <BarChart data={conversionData} onClick={undefined}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#999" />
            <YAxis tick={{ fontSize: 12 }} stroke="#999" unit="%" />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Bar dataKey="conversionRate" radius={[4, 4, 0, 0]} animationDuration={500}>
              {conversionData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={`url(#barGradient)`}
                  cursor="pointer"
                  onClick={(event) => handleBarClick(entry, event)}
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#42A5F5" />
                <stop offset="100%" stopColor="#FFA726" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {selectedBar && modalPos && (
        <div className="stats-popup" style={{
          position: 'fixed',
          left: Math.min(modalPos.x, window.innerWidth - 280),
          top: Math.min(modalPos.y - 20, window.innerHeight - 260),
          background: '#fff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          zIndex: 2000,
          minWidth: '240px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{selectedBar.name}</h4>
            <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#999' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: '#555' }}>
            <div>领取数：<strong>{selectedBar.claimed}</strong></div>
            <div>核销数：<strong>{selectedBar.redeemed}</strong></div>
            <div>转化率：<strong style={{ color: '#42A5F5' }}>{selectedBar.conversionRate}%</strong></div>
            <div>优惠总额：<strong>¥{selectedBar.totalDiscount}</strong></div>
            <div>平均折扣金额：<strong>¥{selectedBar.avgDiscount}</strong></div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#333' }}>活动列表</h3>
        {campaigns.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
            暂无活动，点击右上方按钮创建
          </div>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : window.innerWidth >= 1200 ? 'repeat(4, 1fr)' : window.innerWidth >= 900 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: '16px',
        }}>
          {campaigns.map((c, idx) => (
            <div
              key={c.id}
              style={{
                background: '#FAFAFA',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                padding: '20px',
                transition: `all 0.3s ease-out`,
                animation: `fadeInUp 0.3s ${idx * 0.05}s ease-out both`,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#333' }}>{c.name}</h4>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: statusColor(c.status) + '22',
                  color: statusColor(c.status),
                  fontWeight: 600,
                }}>
                  {statusText(c.status)}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                类型：{typeLabel[c.type] || c.type}
                {c.type === 'full_reduction' && ` · 满${c.minPurchase}减${c.reductionAmount}`}
                {c.type === 'discount' && ` · ${c.discountValue}%折`}
                {c.type === 'fixed' && ` · 立减¥${c.discountValue}`}
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                发放总量：<strong>{c.totalQuantity}</strong>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#2196F3' }}>{c.claimed}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>已领取</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#FF5722' }}>{c.redeemed}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>已核销</div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleTogglePause(c.id, c.status); }}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: c.status === 'active' ? '#FFF3E0' : '#E8F5E9',
                  color: c.status === 'active' ? '#FF9800' : '#4CAF50',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  marginBottom: '8px',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
              >
                {c.status === 'active' ? '暂停活动' : '恢复活动'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpanded(c.id); }}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: '#fff',
                  color: '#666',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
              >
                {expandedMap[c.id] ? '收起优惠券码 ▲' : '查看优惠券码 ▼'}
              </button>
              {expandedMap[c.id] && (
                <div className="coupon-list">
                  <div className="coupon-list-header">优惠券码列表（共{c.coupons.length}张）</div>
                  {c.coupons.map((coupon, i) => (
                    <div key={i} className="coupon-item">
                      <span className="coupon-code">{coupon.code}</span>
                      <div className="coupon-status">
                        <span className="coupon-status-label" style={{ color: couponStatusColor(coupon.status) }}>
                          {couponStatusText(coupon.status)}
                        </span>
                        {coupon.redeemedAt && (
                          <span className="coupon-redeem-time">
                            {new Date(coupon.redeemedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {c.coupons.length > 20 && (
                    <div className="coupon-list-overflow-hint">↑ 滚动查看更多优惠券码</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; bg: string; color: string }> = ({ label, value, bg, color }) => (
  <div style={{
    background: bg,
    borderRadius: '8px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  }}>
    <div style={{ fontSize: '36px', fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
    <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{label}</div>
  </div>
);

export default Dashboard;
