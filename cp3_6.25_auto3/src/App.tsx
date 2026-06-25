import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import DeviceCard from './components/DeviceCard';
import BookingDialog from './components/BookingDialog';
import StatsChart from './components/StatsChart';
import { Device, Booking, DeviceUsage } from './types';

const App = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [sortDesc, setSortDesc] = useState(true);
  const [rippleDevice, setRippleDevice] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    const res = await fetch('/api/devices');
    const data = await res.json();
    setDevices(data);
  }, []);

  const fetchBookings = useCallback(async () => {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    setBookings(data);
  }, []);

  useEffect(() => {
    fetchDevices();
    fetchBookings();
  }, [fetchDevices, fetchBookings]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchDevices();
      fetchBookings();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchDevices, fetchBookings]);

  const calculateUsageRate = (deviceId: string): number => {
    const today = dayjs().format('YYYY-MM-DD');
    const todayBookings = bookings.filter(
      (b) => b.deviceId === deviceId && b.date === today
    );
    const totalHours = todayBookings.reduce((acc, b) => {
      const start = parseInt(b.startTime.split(':')[0]);
      const end = parseInt(b.endTime.split(':')[0]);
      return acc + (end - start);
    }, 0);
    return Math.min(Math.round((totalHours / 14) * 100), 100);
  };

  const getDeviceUsageStats = (): DeviceUsage[] => {
    const weekStart = dayjs().subtract(weekOffset, 'week').startOf('week');
    const weekEnd = weekStart.endOf('week');

    return devices.map((device) => {
      const weekBookings = bookings.filter(
        (b) =>
          b.deviceId === device.id &&
          dayjs(b.date).isAfter(weekStart.subtract(1, 'day')) &&
          dayjs(b.date).isBefore(weekEnd.add(1, 'day'))
      );
      const bookingCount = weekBookings.length;
      const totalHours = weekBookings.reduce((acc, b) => {
        const start = parseInt(b.startTime.split(':')[0]);
        const end = parseInt(b.endTime.split(':')[0]);
        return acc + (end - start);
      }, 0);
      const usageRate = Math.min(Math.round((totalHours / (14 * 7)) * 100), 100);

      return {
        deviceId: device.id,
        deviceName: device.name,
        bookingCount,
        totalHours,
        usageRate,
      };
    });
  };

  const handleDeviceClick = (device: Device) => {
    if (device.status === 'idle' && !device.maintenance) {
      setSelectedDevice(device);
      setShowBookingDialog(true);
    }
  };

  const handleBookingSuccess = async () => {
    if (selectedDevice) {
      setRippleDevice(selectedDevice.id);
      setTimeout(() => setRippleDevice(null), 1000);
    }
    setShowBookingDialog(false);
    setSelectedDevice(null);
    await fetchBookings();
    await fetchDevices();
  };

  const handleDeviceUpdate = async (deviceId: string, updates: Partial<Device>) => {
    await fetch(`/api/devices/${deviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await fetchDevices();
  };

  const sortedUsageStats = () => {
    const stats = getDeviceUsageStats();
    return stats.sort((a, b) =>
      sortDesc ? b.usageRate - a.usageRate : a.usageRate - b.usageRate
    );
  };

  const weeklyTotalBookings = () => {
    return getDeviceUsageStats().reduce((acc, s) => acc + s.bookingCount, 0);
  };

  const getUsageBarColor = (rate: number): string => {
    if (rate < 30) return '#42a5f5';
    if (rate <= 70) return '#ff9800';
    return '#f44336';
  };

  const sidebarVisible = showSidebar;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ flex: 1, padding: '24px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: '#004d40', fontSize: '28px', fontWeight: 700 }}>共享工坊设备看板</h1>
            <p style={{ color: '#00796b', fontSize: '14px', marginTop: '4px' }}>
              实时查看设备状态 · 快速预约设备使用
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: isAdmin ? '#004d40' : '#e0e0e0',
                color: isAdmin ? '#fff' : '#333',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease-out',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)')}
            >
              {isAdmin ? '管理员模式' : '会员模式'}
            </button>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              style={{
                display: window.innerWidth < 768 ? 'flex' : 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#004d40',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              ☰
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              bookings={bookings.filter((b) => b.deviceId === device.id)}
              usageRate={calculateUsageRate(device.id)}
              isAdmin={isAdmin}
              onClick={() => handleDeviceClick(device)}
              onUpdate={handleDeviceUpdate}
              showRipple={rippleDevice === device.id}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: window.innerWidth < 768 ? (sidebarVisible ? 'block' : 'none') : 'block',
          position: window.innerWidth < 768 ? 'fixed' : 'sticky',
          top: 0,
          right: 0,
          width: '300px',
          height: '100vh',
          borderLeft: '1px solid #e0e0e0',
          backgroundColor: '#fff',
          overflowY: 'auto',
          padding: '24px',
          zIndex: 100,
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>本周预约总数</span>
            <span className="float-arrow" style={{ fontSize: '20px', color: '#4caf50' }}>↑</span>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#004d40', marginTop: '4px' }}>
            {weeklyTotalBookings()}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>设备使用统计</span>
            <button
              onClick={() => setWeekOffset(weekOffset === 0 ? 1 : 0)}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: '#004d40',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.3s ease-out',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)')}
            >
              {weekOffset === 0 ? '查看上周' : '查看本周'}
            </button>
          </div>
          <StatsChart usageStats={getDeviceUsageStats()} />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>设备使用率排行</span>
            <button
              onClick={() => setSortDesc(!sortDesc)}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                backgroundColor: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
              }}
            >
              {sortDesc ? '降序 ↓' : '升序 ↑'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedUsageStats().map((stat) => (
              <div key={stat.deviceId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#333' }}>{stat.deviceName}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: getUsageBarColor(stat.usageRate) }}>
                    {stat.usageRate}%
                  </span>
                </div>
                <div
                  style={{
                    width: '200px',
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: '#e0e0e0',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${stat.usageRate}%`,
                      height: '100%',
                      backgroundColor: getUsageBarColor(stat.usageRate),
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showBookingDialog && selectedDevice && (
        <BookingDialog
          device={selectedDevice}
          bookings={bookings}
          onClose={() => {
            setShowBookingDialog(false);
            setSelectedDevice(null);
          }}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
};

export default App;
