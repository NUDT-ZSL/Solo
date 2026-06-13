import { useState, useEffect, useCallback, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';

interface Space {
  _id: string;
  name: string;
  capacity: number;
  status: string;
}

interface Device {
  _id: string;
  name: string;
  status: string;
  borrowCount: number;
  description: string;
  expectedReturnTime?: string;
}

type NavKey = 'spaces' | 'devices' | 'stats';

const NAV_ITEMS: { key: NavKey; label: string; icon: string }[] = [
  { key: 'spaces', label: '空间管理', icon: '🏢' },
  { key: 'devices', label: '设备管理', icon: '🔧' },
  { key: 'stats', label: '统计报表', icon: '📊' }
];

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState<NavKey>('spaces');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [bookingStats, setBookingStats] = useState<{ spaceName: string; count: number }[]>([]);
  const [deviceStats, setDeviceStats] = useState<{ deviceName: string; count: number }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(window.innerWidth < 768);
  const [todayBookingCounts, setTodayBookingCounts] = useState<Record<string, number>>({});
  const chartRef = useRef<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [spacesRes, devicesRes, bookingStatsRes, deviceStatsRes, bookingsRes] = await Promise.all([
        axios.get('/api/spaces'),
        axios.get('/api/devices'),
        axios.get('/api/stats/bookings'),
        axios.get('/api/stats/devices'),
        axios.get('/api/bookings')
      ]);
      setSpaces(spacesRes.data);
      setDevices(devicesRes.data);
      setBookingStats(bookingStatsRes.data);
      setDeviceStats(deviceStatsRes.data);

      const today = new Date().toISOString().split('T')[0];
      const counts: Record<string, number> = {};
      spacesRes.data.forEach((s: Space) => { counts[s._id] = 0; });
      bookingsRes.data.forEach((b: any) => {
        if (b.date === today && counts[b.spaceId] !== undefined) {
          counts[b.spaceId]++;
        }
      });
      setTodayBookingCounts(counts);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleResize = () => {
      const compact = window.innerWidth < 768;
      setIsCompact(compact);
      if (!compact) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSpaceStatus = async (spaceId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await axios.put(`/api/spaces/${spaceId}/status`, { status: newStatus });
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle space status', err);
    }
  };

  const toggleDeviceStatus = async (deviceId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
    try {
      await axios.put(`/api/devices/${deviceId}/status`, { status: newStatus });
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle device status', err);
    }
  };

  const getBarChartOption = () => {
    const dataCount = bookingStats.length;
    let barWidth: number;
    if (dataCount <= 3) {
      barWidth = 40;
    } else if (dataCount <= 6) {
      barWidth = 36;
    } else if (dataCount <= 10) {
      barWidth = 28;
    } else {
      barWidth = Math.max(16, Math.floor(400 / dataCount));
    }

    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: '10%', right: '10%', top: '10%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: bookingStats.map((s) => s.spaceName),
        axisLabel: { fontSize: 12, color: '#6b7280' },
        axisLine: { lineStyle: { color: '#e5e7eb' } }
      },
      yAxis: {
        type: 'value' as const,
        name: '预约人次',
        axisLabel: { fontSize: 12, color: '#6b7280' },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        splitLine: { lineStyle: { color: '#f3f4f6' } }
      },
      series: [
        {
          type: 'bar' as const,
          data: bookingStats.map((s) => s.count),
          barWidth,
          barGap: '20%',
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#93c5fd' }
              ]
            }
          }
        }
      ]
    };
  };

  const getPieChartOption = () => {
    const colors = ['#f97316', '#22c55e', '#a855f7', '#06b6d4', '#eab308', '#ef4444'];
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c}次 ({d}%)' },
      legend: {
        bottom: '5%',
        left: 'center',
        textStyle: { fontSize: 12, color: '#6b7280' }
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['35%', '60%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, fontSize: 12, formatter: '{b}\n{d}%' },
          data: deviceStats.map((d, i) => ({
            name: d.deviceName,
            value: d.count,
            itemStyle: { color: colors[i % colors.length] }
          }))
        }
      ]
    };
  };

  const renderSpacesPanel = () => (
    <div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e3a5f', marginBottom: '16px' }}>🏢 活动室管理</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {spaces.map((space) => (
          <div
            key={space._id}
            className="card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: space.status === 'inactive' ? 0.6 : 1
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>{space.name}</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor: space.status === 'active' ? '#d1fae5' : '#fee2e2',
                  color: space.status === 'active' ? '#059669' : '#dc2626'
                }}>
                  {space.status === 'active' ? '已上架' : '已下架'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                今日预约：{todayBookingCounts[space._id] || 0}次 · 总容量：{space.capacity}人
              </div>
            </div>
            <button
              className={`btn ${space.status === 'active' ? 'btn-outline' : 'btn-orange'}`}
              style={{ padding: '6px 16px', fontSize: '13px' }}
              onClick={() => toggleSpaceStatus(space._id, space.status)}
            >
              {space.status === 'active' ? '下架' : '上架'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDevicesPanel = () => (
    <div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e3a5f', marginBottom: '16px' }}>🔧 设备管理</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {devices.map((device) => (
          <div
            key={device._id}
            className="card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>{device.name}</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor:
                    device.status === 'available' ? '#d1fae5' :
                    device.status === 'borrowed' ? '#fef3c7' : '#e5e7eb',
                  color:
                    device.status === 'available' ? '#059669' :
                    device.status === 'borrowed' ? '#d97706' : '#6b7280'
                }}>
                  {device.status === 'available' ? '可借用' : device.status === 'borrowed' ? '已借出' : '维修中'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {device.description} · 累计借用{device.borrowCount}次
                {device.expectedReturnTime && ` · 预计归还：${new Date(device.expectedReturnTime).toLocaleString('zh-CN')}`}
              </div>
            </div>
            <button
              className={`btn ${device.status === 'maintenance' ? 'btn-orange' : 'btn-outline'}`}
              style={{ padding: '6px 16px', fontSize: '13px' }}
              onClick={() => toggleDeviceStatus(device._id, device.status)}
            >
              {device.status === 'maintenance' ? '恢复可用' : '设为维修'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStatsPanel = () => (
    <div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e3a5f', marginBottom: '16px' }}>📊 统计报表</h3>
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 500, color: '#374151', marginBottom: '12px' }}>本周各活动室预约人次</h4>
        <ReactECharts
          ref={chartRef}
          option={getBarChartOption()}
          style={{ height: '320px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
      <div className="card" style={{ padding: '24px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 500, color: '#374151', marginBottom: '12px' }}>设备借用次数占比</h4>
        <ReactECharts
          option={getPieChartOption()}
          style={{ height: '320px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeNav) {
      case 'spaces': return renderSpacesPanel();
      case 'devices': return renderDevicesPanel();
      case 'stats': return renderStatsPanel();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0', minHeight: 'calc(100vh - 140px)' }}>
      {!isCompact && (
        <aside style={{
          width: '240px',
          flexShrink: 0,
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '12px' }}>
            <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600 }}>管理中心</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>Administration</div>
          </div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveNav(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeNav === item.key ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: activeNav === item.key ? '#93c5fd' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeNav === item.key ? 500 : 400,
                transition: 'all 0.2s',
                width: '100%',
                textAlign: 'left',
                borderLeft: activeNav === item.key ? '3px solid #3b82f6' : '3px solid transparent',
                fontFamily: 'inherit'
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>
      )}

      {isCompact && (
        <div style={{ marginBottom: '16px', width: '100%' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveNav(item.key)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '20px',
                  backgroundColor: activeNav === item.key ? '#1e3a5f' : '#ffffff',
                  color: activeNav === item.key ? '#ffffff' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s'
                }}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{
        flex: 1,
        padding: isCompact ? '0' : '0 24px',
        overflow: 'auto'
      }}>
        {renderContent()}
      </div>
    </div>
  );
}
