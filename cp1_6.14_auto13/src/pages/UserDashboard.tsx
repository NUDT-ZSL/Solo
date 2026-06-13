import React, { useState, useEffect, useCallback } from 'react';
import { User, Course, Booking, TrainingRecord, getCourses, getBookings, getUserRecords, createRecord, getBodyTrend } from '../api/requests';
import BookingCalendar from '../components/BookingCalendar';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FixedSizeList as List } from 'react-window';

interface UserDashboardProps {
  user: User;
}

export default function UserDashboard({ user }: UserDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<'week' | 'month'>('week');
  const [activeTab, setActiveTab] = useState<'calendar' | 'records' | 'body'>('calendar');

  const [bodyForm, setBodyForm] = useState({
    weight: '',
    bodyFat: '',
    chest: '',
    waist: '',
    hips: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [c, b, r] = await Promise.all([
        getCourses(),
        getBookings({ userId: user._id }),
        getUserRecords(user._id),
      ]);
      setCourses(c);
      setBookings(b);
      setRecords(r);
    } catch {
      toast.error('加载数据失败');
    }
  }, [user._id]);

  const loadTrend = useCallback(async () => {
    try {
      const data = await getBodyTrend(user._id, trendPeriod);
      setTrendData(data.map(d => ({
        date: d.date.slice(5),
        weight: d.weight,
        bodyFat: d.bodyFat,
      })));
    } catch {
      toast.error('加载趋势数据失败');
    }
  }, [user._id, trendPeriod]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadTrend(); }, [loadTrend]);

  const weekTrainingRecords = records.filter(r => r.type === 'training');
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekRecords = weekTrainingRecords.filter(r => new Date(r.date) >= weekStart);
  const totalMinutes = weekRecords.reduce((s, r) => s + (r.duration || 0), 0);
  const totalCalories = weekRecords.reduce((s, r) => s + (r.calories || 0), 0);

  const recentRecords = weekTrainingRecords;

  const handleBodySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRecord({
        userId: user._id,
        date: new Date().toISOString().split('T')[0],
        type: 'body',
        weight: bodyForm.weight ? parseFloat(bodyForm.weight) : undefined,
        bodyFat: bodyForm.bodyFat ? parseFloat(bodyForm.bodyFat) : undefined,
        chest: bodyForm.chest ? parseFloat(bodyForm.chest) : undefined,
        waist: bodyForm.waist ? parseFloat(bodyForm.waist) : undefined,
        hips: bodyForm.hips ? parseFloat(bodyForm.hips) : undefined,
      });
      toast.success('身体指标已记录');
      setBodyForm({ weight: '', bodyFat: '', chest: '', waist: '', hips: '' });
      await loadData();
      await loadTrend();
    } catch {
      toast.error('记录失败');
    }
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const r = recentRecords[index];
    return (
      <div style={style} className="record-row">
        <div className="record-date">{r.date}</div>
        <div className="record-info">
          <span className="record-course">{r.courseName || '自主训练'}</span>
          <span className="record-coach">{r.coachName || ''}</span>
        </div>
        <div className="record-duration">{r.duration}分钟</div>
        <div className="record-notes">{r.notes || '-'}</div>
      </div>
    );
  };

  return (
    <div className="user-dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalMinutes}</div>
          <div className="stat-label">本周训练时长(分钟)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalCalories}</div>
          <div className="stat-label">本周消耗卡路里</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{weekRecords.length}</div>
          <div className="stat-label">本周训练次数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{bookings.filter(b => b.status === 'booked').length}</div>
          <div className="stat-label">待上课预约</div>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>课程日历</button>
        <button className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}>训练记录</button>
        <button className={`tab-btn ${activeTab === 'body' ? 'active' : ''}`} onClick={() => setActiveTab('body')}>身体指标</button>
      </div>

      {activeTab === 'calendar' && (
        <BookingCalendar
          courses={courses}
          bookings={bookings}
          userId={user._id}
          onBookingChange={loadData}
        />
      )}

      {activeTab === 'records' && (
        <div className="records-section">
          <h2 className="section-title">📋 训练记录</h2>
          {recentRecords.length === 0 ? (
            <div className="empty-state">暂无训练记录</div>
          ) : recentRecords.length > 20 ? (
            <List
              height={400}
              itemCount={recentRecords.length}
              itemSize={56}
              width="100%"
            >
              {Row}
            </List>
          ) : (
            <div className="records-list">
              {recentRecords.map(r => (
                <div key={r._id} className="record-row">
                  <div className="record-date">{r.date}</div>
                  <div className="record-info">
                    <span className="record-course">{r.courseName || '自主训练'}</span>
                    <span className="record-coach">{r.coachName || ''}</span>
                  </div>
                  <div className="record-duration">{r.duration}分钟</div>
                  <div className="record-notes">{r.notes || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'body' && (
        <div className="body-section">
          <h2 className="section-title">💪 身体指标</h2>
          <div className="body-trend-controls">
            <button className={`trend-btn ${trendPeriod === 'week' ? 'active' : ''}`} onClick={() => setTrendPeriod('week')}>近一周</button>
            <button className={`trend-btn ${trendPeriod === 'month' ? 'active' : ''}`} onClick={() => setTrendPeriod('month')}>近一月</button>
          </div>
          {trendData.length > 0 ? (
            <div className="trend-chart">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} name="体重(kg)" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="bodyFat" stroke="#1e293b" strokeWidth={2} name="体脂率(%)" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">暂无身体指标数据，请先记录</div>
          )}

          <form className="body-form" onSubmit={handleBodySubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>体重 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyForm.weight}
                  onChange={e => setBodyForm(f => ({ ...f, weight: e.target.value }))}
                  className="form-input"
                  placeholder="如: 65.5"
                />
              </div>
              <div className="form-group">
                <label>体脂率 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyForm.bodyFat}
                  onChange={e => setBodyForm(f => ({ ...f, bodyFat: e.target.value }))}
                  className="form-input"
                  placeholder="如: 18.5"
                />
              </div>
              <div className="form-group">
                <label>胸围 (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyForm.chest}
                  onChange={e => setBodyForm(f => ({ ...f, chest: e.target.value }))}
                  className="form-input"
                  placeholder="如: 92"
                />
              </div>
              <div className="form-group">
                <label>腰围 (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyForm.waist}
                  onChange={e => setBodyForm(f => ({ ...f, waist: e.target.value }))}
                  className="form-input"
                  placeholder="如: 78"
                />
              </div>
              <div className="form-group">
                <label>臀围 (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyForm.hips}
                  onChange={e => setBodyForm(f => ({ ...f, hips: e.target.value }))}
                  className="form-input"
                  placeholder="如: 95"
                />
              </div>
            </div>
            <button type="submit" className="submit-btn">提交记录</button>
          </form>
        </div>
      )}
    </div>
  );
}
