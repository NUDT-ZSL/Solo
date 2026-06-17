import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface EventItem {
  id: string;
  name: string;
  dateTime: string;
  location: string;
  totalStalls: number;
  pricePerStall: number;
  bookedStalls: number;
}

interface Transaction {
  id: string;
  eventId: string;
  stallNumber: string;
  userEmail: string;
  amount: number;
  createdAt: string;
}

interface Feedback {
  id: string;
  eventId: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const COLORS = ['#42a5f5', '#66bb6a', '#ffa726', '#ef5350', '#ab47bc', '#26c6da'];

const MarketManage = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'transactions' | 'feedbacks' | 'stats'>('events');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filterEventId, setFilterEventId] = useState('all');
  const [feedbackFilterEventId, setFeedbackFilterEventId] = useState('all');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFeedbackExportModal, setShowFeedbackExportModal] = useState(false);
  const [exportEventId, setExportEventId] = useState('all');
  const [loading, setLoading] = useState(true);

  const [newEvent, setNewEvent] = useState({
    name: '',
    dateTime: '',
    location: '',
    totalStalls: 20,
    pricePerStall: 50,
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('error');

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsRes, txRes, fbRes] = await Promise.all([
        fetch('/api/events'),
        fetch(`/api/transactions${filterEventId !== 'all' ? `?eventId=${filterEventId}` : ''}`),
        fetch(`/api/events`),
      ]);
      const eventsData = await eventsRes.json();
      const txData = await txRes.json();
      setEvents(eventsData);
      setTransactions(txData);

      if (feedbackFilterEventId !== 'all') {
        const fbRes = await fetch(`/api/events/${feedbackFilterEventId}/feedbacks`);
        const fbData = await fbRes.json();
        setFeedbacks(fbData);
      } else {
        const allFeedbacks: Feedback[] = [];
        for (const ev of eventsData) {
          const res = await fetch(`/api/events/${ev.id}/feedbacks`);
          const data = await res.json();
          allFeedbacks.push(...data);
        }
        allFeedbacks.sort((a, b) => b.rating - a.rating);
        setFeedbacks(allFeedbacks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterEventId, feedbackFilterEventId]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name || !newEvent.dateTime || !newEvent.location) {
      setMessage('请填写所有必填字段');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowCreateEvent(false);
      setNewEvent({ name: '', dateTime: '', location: '', totalStalls: 20, pricePerStall: 50 });
      setMessage('活动创建成功！');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err: any) {
      setMessage(err.message || '创建失败');
      setMessageType('error');
    }
  };

  const handleExportCSV = () => {
    const url = `/api/transactions/export${exportEventId !== 'all' ? `?eventId=${exportEventId}` : ''}`;
    window.open(url, '_blank');
    setShowExportModal(false);
  };

  const handleFeedbackExportCSV = () => {
    const url = `/api/feedbacks/export${feedbackFilterEventId !== 'all' ? `?eventId=${feedbackFilterEventId}` : ''}`;
    window.open(url, '_blank');
    setShowFeedbackExportModal(false);
  };

  const revenueData = events.map((ev) => ({
    name: ev.name.length > 8 ? ev.name.slice(0, 8) + '...' : ev.name,
    收入: ev.bookedStalls * ev.pricePerStall,
    摊位费: ev.pricePerStall,
  }));

  const ratingData = [1, 2, 3, 4, 5].map((r) => ({
    name: `${r}星`,
    value: feedbacks.filter((f) => f.rating === r).length,
  })).filter((d) => d.value > 0);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          🛠️ 管理后台
        </h1>
        {activeTab === 'events' && (
          <button className="btn btn-primary" onClick={() => setShowCreateEvent(true)}>
            + 创建新活动
          </button>
        )}
      </div>

      {message && (
        <div className={`alert ${messageType === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div className="tabs">
        <div className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
          📋 活动管理
        </div>
        <div className={`tab ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
          💰 交易记录
        </div>
        <div className={`tab ${activeTab === 'feedbacks' ? 'active' : ''}`} onClick={() => setActiveTab('feedbacks')}>
          ⭐ 反馈管理
        </div>
        <div className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          📊 数据统计
        </div>
      </div>

      {activeTab === 'events' && (
        <div>
          {loading ? (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <div className="empty-text">加载中...</div>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-text">暂无活动，点击上方按钮创建</div>
            </div>
          ) : (
            <div className="events-grid">
              {events.map((event) => {
                const percent = Math.round((event.bookedStalls / event.totalStalls) * 100);
                const remaining = event.totalStalls - event.bookedStalls;
                return (
                  <div key={event.id} className="event-card">
                    <div className="event-card-header">
                      <div className="event-card-name">{event.name}</div>
                      <div className="event-card-date">
                        📅 {dayjs(event.dateTime).format('YYYY-MM-DD HH:mm')}
                      </div>
                      <div className="event-card-location">📍 {event.location}</div>
                    </div>
                    <div className="event-card-footer">
                      <div className="progress-row">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="price-text">¥{event.pricePerStall}/个</span>
                      </div>
                      <span className="remaining-text">剩余 {remaining} 个</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div>
          <div className="filter-bar">
            <select
              className="form-input"
              style={{ width: 200 }}
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
            >
              <option value="all">全部活动</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
            <button className="btn btn-secondary" onClick={() => { setExportEventId(filterEventId); setShowExportModal(true); }}>
              📥 导出CSV
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <div className="empty-text">加载中...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <div className="empty-text">暂无交易记录</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>摊位编号</th>
                    <th>用户邮箱</th>
                    <th>交易时间</th>
                    <th>金额</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600 }}>{tx.stallNumber}</td>
                      <td>{tx.userEmail}</td>
                      <td>{dayjs(tx.createdAt).format('YYYY-MM-DD HH:mm:ss')}</td>
                      <td style={{ color: '#ef5350', fontWeight: 600 }}>¥{tx.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 16, textAlign: 'right', fontSize: 14, color: '#666' }}>
                共 <strong>{transactions.length}</strong> 条记录，合计：
                <strong style={{ color: '#ef5350', fontSize: 18, marginLeft: 4 }}>
                  ¥{transactions.reduce((sum, t) => sum + t.amount, 0)}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'feedbacks' && (
        <div>
          <div className="filter-bar">
            <select
              className="form-input"
              style={{ width: 200 }}
              value={feedbackFilterEventId}
              onChange={(e) => setFeedbackFilterEventId(e.target.value)}
            >
              <option value="all">全部活动</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
            <button className="btn btn-secondary" onClick={() => setShowFeedbackExportModal(true)}>
              📥 导出CSV
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <div className="empty-text">加载中...</div>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <div className="empty-text">暂无反馈数据</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              {feedbacks.map((fb) => {
                const ev = events.find((e) => e.id === fb.eventId);
                return (
                  <div key={fb.id} className="feedback-item">
                    <div className="feedback-header">
                      <span className="feedback-user">
                        {fb.userEmail}
                        {ev && (
                          <span style={{ marginLeft: 8, color: '#999', fontSize: 12, fontWeight: 400 }}>
                            · {ev.name}
                          </span>
                        )}
                      </span>
                      <span className="feedback-stars">{'⭐'.repeat(fb.rating)}</span>
                    </div>
                    {fb.comment && <div className="feedback-comment">{fb.comment}</div>}
                    <div className="feedback-date">{dayjs(fb.createdAt).format('YYYY-MM-DD HH:mm')}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div>
          <div className="charts-row">
            <div className="card">
              <div className="section-title">各活动收入</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="收入" fill="#42a5f5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="section-title">评分分布</div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={ratingData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {ratingData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div className="section-title">运营概览</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, background: '#e3f2fd', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>活动总数</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1565c0' }}>{events.length}</div>
              </div>
              <div style={{ padding: 16, background: '#f0f4c3', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>总摊位</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#558b2f' }}>
                  {events.reduce((s, e) => s + e.totalStalls, 0)}
                </div>
              </div>
              <div style={{ padding: 16, background: '#e8f5e9', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>已预订</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#2e7d32' }}>
                  {events.reduce((s, e) => s + e.bookedStalls, 0)}
                </div>
              </div>
              <div style={{ padding: 16, background: '#ffebee', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>总收入</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#c62828' }}>
                  ¥{events.reduce((s, e) => s + e.bookedStalls * e.pricePerStall, 0)}
                </div>
              </div>
              <div style={{ padding: 16, background: '#fff3e0', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>交易笔数</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#ef6c00' }}>{transactions.length}</div>
              </div>
              <div style={{ padding: 16, background: '#f3e5f5', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>平均评分</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#6a1b9a' }}>
                  {feedbacks.length
                    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
                    : '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateEvent && (
        <div className="modal-overlay" onClick={() => setShowCreateEvent(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">创建新活动</div>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label className="form-label">活动名称</label>
                <input
                  type="text"
                  className="form-input"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  placeholder="例如：春季社区跳蚤市场"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">日期时间</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={newEvent.dateTime}
                  onChange={(e) => setNewEvent({ ...newEvent, dateTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">活动地点</label>
                <input
                  type="text"
                  className="form-input"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="例如：社区中心广场"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">总摊位数</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={newEvent.totalStalls}
                    onChange={(e) => setNewEvent({ ...newEvent, totalStalls: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">摊位单价（元）</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={newEvent.pricePerStall}
                    onChange={(e) => setNewEvent({ ...newEvent, pricePerStall: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateEvent(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">导出交易报表</div>
            <div className="form-group">
              <label className="form-label">选择活动</label>
              <select
                className="form-input"
                value={exportEventId}
                onChange={(e) => setExportEventId(e.target.value)}
              >
                <option value="all">全部活动</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowExportModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleExportCSV}>
                下载CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackExportModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">导出反馈报表</div>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
              将导出活动 <strong>{feedbackFilterEventId === 'all' ? '全部' : events.find((e) => e.id === feedbackFilterEventId)?.name}</strong> 的反馈数据
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowFeedbackExportModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleFeedbackExportCSV}>
                下载CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketManage;
