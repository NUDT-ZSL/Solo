import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface Booking {
  _id: string;
  spaceId: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  peopleCount: number;
  devices: string[];
  notes: string;
  createdAt: string;
}

interface Space {
  _id: string;
  name: string;
  capacity: number;
  status: string;
}

const HOURS_START = 7;
const HOURS_END = 22;
const CELL_HEIGHT = 60;
const CELL_HEIGHT_COMPACT = 50;

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getNext7Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function getWeekday(date: Date): string {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[date.getDay()];
}

function timeToHour(time: string): number {
  const [h] = time.split(':').map(Number);
  return h;
}

function getCellStatus(
  hour: number,
  dateStr: string,
  spaceId: string,
  bookings: Booking[]
): { status: 'available' | 'booked' | 'maintenance'; booking?: Booking } {
  const booking = bookings.find(
    (b) =>
      b.spaceId === spaceId &&
      b.date === dateStr &&
      timeToHour(b.startTime) <= hour &&
      timeToHour(b.endTime) > hour
  );
  if (booking) return { status: 'booked', booking };
  return { status: 'available' };
}

function isBookingStart(hour: number, booking: Booking): boolean {
  return timeToHour(booking.startTime) === hour;
}

function getBookingSpan(booking: Booking): number {
  return timeToHour(booking.endTime) - timeToHour(booking.startTime);
}

export default function Calendar() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{ date: string; hour: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isCompact, setIsCompact] = useState(window.innerWidth < 768);
  const [form, setForm] = useState({
    spaceId: '',
    date: '',
    startTime: '',
    endTime: '',
    peopleCount: '',
    devices: [] as string[],
    notes: ''
  });

  const days = getNext7Days();

  const fetchData = useCallback(async () => {
    try {
      const [bookingsRes, spacesRes] = await Promise.all([
        axios.get('/api/bookings'),
        axios.get('/api/spaces')
      ]);
      setBookings(bookingsRes.data);
      const activeSpaces = spacesRes.data.filter((s: Space) => s.status === 'active');
      setSpaces(activeSpaces);
      if (!selectedSpace && activeSpaces.length > 0) {
        setSelectedSpace(activeSpaces[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  }, [selectedSpace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cellHeight = isCompact ? CELL_HEIGHT_COMPACT : CELL_HEIGHT;

  const handleCellClick = (date: string, hour: number) => {
    const status = getCellStatus(hour, date, selectedSpace, bookings);
    if (status.status !== 'available') return;

    const dateObj = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateObj < today) return;

    const startHour = String(hour).padStart(2, '0');
    const endHour = String(hour + 1).padStart(2, '0');
    setForm({
      spaceId: selectedSpace,
      date,
      startTime: `${startHour}:00`,
      endTime: `${endHour}:00`,
      peopleCount: '',
      devices: [],
      notes: ''
    });
    setModalData({ date, hour });
    setShowModal(true);
    setSubmitError('');
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!form.spaceId || !form.date || !form.startTime || !form.endTime || !form.peopleCount) {
      setSubmitError('请填写所有必填项');
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      const source = axios.CancelToken.source();
      const timeout = setTimeout(() => source.cancel('请求超时'), 800);

      await axios.post('/api/bookings', {
        spaceId: form.spaceId,
        spaceName: spaces.find((s) => s._id === form.spaceId)?.name || '',
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        peopleCount: parseInt(form.peopleCount),
        devices: form.devices,
        notes: form.notes
      }, { cancelToken: source.token });

      clearTimeout(timeout);
      setShowModal(false);
      setModalData(null);
      await fetchData();
    } catch (err: any) {
      if (axios.isCancel(err)) {
        setSubmitError('请求超时，请重试');
      } else if (err.response?.data?.error) {
        setSubmitError(err.response.data.error);
      } else {
        setSubmitError('提交失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleDevice = (deviceName: string) => {
    setForm((prev) => ({
      ...prev,
      devices: prev.devices.includes(deviceName)
        ? prev.devices.filter((d) => d !== deviceName)
        : [...prev.devices, deviceName]
    }));
  };

  const currentSpace = spaces.find((s) => s._id === selectedSpace);
  const deviceOptions = ['投影仪', '白板', '音响系统', '移动白板支架'];

  const renderDayColumn = (date: Date) => {
    const dateStr = formatDate(date);
    const cells: React.ReactNode[] = [];
    let skipUntilHour = HOURS_START - 1;

    for (let h = HOURS_START; h < HOURS_END; h++) {
      if (h <= skipUntilHour) continue;

      const cellInfo = getCellStatus(h, dateStr, selectedSpace, bookings);

      if (cellInfo.status === 'booked' && cellInfo.booking) {
        if (isBookingStart(h, cellInfo.booking)) {
          const span = getBookingSpan(cellInfo.booking);
          skipUntilHour = timeToHour(cellInfo.booking.endTime) - 1;
          cells.push(
            <div
              key={`${dateStr}-${h}`}
              style={{
                height: `${span * cellHeight}px`,
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '4px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e' }}>
                {cellInfo.booking.spaceName}
              </div>
              <div style={{ fontSize: '11px', color: '#b45309' }}>
                {cellInfo.booking.startTime} - {cellInfo.booking.endTime}
              </div>
              <div style={{ fontSize: '11px', color: '#b45309' }}>
                {cellInfo.booking.peopleCount}人
                {cellInfo.booking.devices.length > 0 && ` | ${cellInfo.booking.devices.join(', ')}`}
              </div>
            </div>
          );
        }
      } else {
        const dateObj = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPast = dateObj < today;
        const bgColor = cellInfo.status === 'maintenance' ? '#e5e7eb' : '#d1fae5';
        const cursor = cellInfo.status === 'maintenance' || isPast ? 'not-allowed' : 'pointer';

        cells.push(
          <div
            key={`${dateStr}-${h}`}
            onClick={() => handleCellClick(dateStr, h)}
            style={{
              height: `${cellHeight}px`,
              backgroundColor: bgColor,
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              cursor,
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: cellInfo.status === 'maintenance' ? '#6b7280' : '#065f46',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              if (cursor === 'pointer') {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#a7f3d0';
              }
            }}
            onMouseLeave={(e) => {
              if (cellInfo.status !== 'maintenance') {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#d1fae5';
              }
            }}
          >
            {cellInfo.status === 'maintenance' ? '维护中' : isPast ? '已过' : '可预约'}
          </div>
        );
      }
    }

    return cells;
  };

  return (
    <div>
      <h2 className="page-title">📅 活动室预约</h2>

      <div style={{
        marginBottom: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>选择空间：</label>
        <select
          className="form-select"
          value={selectedSpace}
          onChange={(e) => setSelectedSpace(e.target.value)}
          style={{ width: 'auto', minWidth: '180px' }}
        >
          {spaces.map((space) => (
            <option key={space._id} value={space._id}>
              {space.name}（容量{space.capacity}人）
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', marginLeft: 'auto' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '14px', height: '14px', backgroundColor: '#d1fae5', borderRadius: '3px', display: 'inline-block', border: '1px solid #a7f3d0' }}></span>
            可预约
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '14px', height: '14px', backgroundColor: '#fef3c7', borderRadius: '3px', display: 'inline-block', border: '1px solid #fde68a' }}></span>
            已预约
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '14px', height: '14px', backgroundColor: '#e5e7eb', borderRadius: '3px', display: 'inline-block', border: '1px solid #d1d5db' }}></span>
            维护中
          </span>
        </div>
      </div>

      <div style={{
        overflowX: 'auto',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', minWidth: isCompact ? '600px' : '800px' }}>
          <div style={{ width: '60px', flexShrink: 0 }}>
            <div style={{
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6b7280',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e5e7eb'
            }}>
              时间
            </div>
            {Array.from({ length: HOURS_END - HOURS_START }, (_, i) => HOURS_START + i).map((h) => (
              <div
                key={h}
                style={{
                  height: `${cellHeight}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: '#6b7280',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  backgroundColor: '#f8fafc'
                }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {days.map((date) => {
            const dateStr = formatDate(date);
            const isToday = formatDate(new Date()) === dateStr;
            return (
              <div key={dateStr} style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  height: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? '#2563eb' : '#374151',
                  backgroundColor: isToday ? '#eff6ff' : '#f8fafc',
                  borderBottom: isToday ? '2px solid #2563eb' : '1px solid #e5e7eb'
                }}>
                  <span>{getWeekday(date)}</span>
                  <span style={{ fontSize: '11px' }}>{`${date.getMonth() + 1}/${date.getDate()}`}</span>
                </div>
                {renderDayColumn(date)}
              </div>
            );
          })}
        </div>
      </div>

      {showModal && modalData && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setModalData(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📝 预约活动室</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setModalData(null); }}>×</button>
            </div>

            {submitError && (
              <div style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {submitError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">空间名称 *</label>
              <select
                className="form-select"
                value={form.spaceId}
                onChange={(e) => setForm({ ...form, spaceId: e.target.value })}
              >
                <option value="">请选择空间</option>
                {spaces.map((space) => (
                  <option key={space._id} value={space._id}>{space.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">日期 *</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">使用人数 *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="请输入人数"
                  min="1"
                  max={currentSpace?.capacity || 100}
                  value={form.peopleCount}
                  onChange={(e) => setForm({ ...form, peopleCount: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">开始时间 *</label>
                <input
                  type="time"
                  className="form-input"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">结束时间 *</label>
                <input
                  type="time"
                  className="form-input"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">设备需求</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {deviceOptions.map((device) => (
                  <label
                    key={device}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: form.devices.includes(device) ? '1px solid #2563eb' : '1px solid #d1d5db',
                      backgroundColor: form.devices.includes(device) ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.devices.includes(device)}
                      onChange={() => toggleDevice(device)}
                      style={{ display: 'none' }}
                    />
                    {device}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">备注</label>
              <textarea
                className="form-textarea"
                placeholder="如有特殊需求请备注"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px'
              }}
            >
              {loading ? '提交中...' : '确认预约'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
