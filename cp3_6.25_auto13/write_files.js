const fs = require('fs');
const path = require('path');

const adminPanelCode = import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { Category } from '../types';

const AdminPanel = () => {
  const { markets, addMarket, bookStall, cancelStall, user } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [expandedMarket, setExpandedMarket] = useState(null);

  if (!user || !user.isAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }} className="fade-in">
        <h2 style={{ color: '#4a148c', marginBottom: '16px' }}>无权限访问</h2>
        <p style={{ color: '#7b1fa2', marginBottom: '20px' }}>请使用管理员账号登录</p>
        <button onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  const handleCreateMarket = () => {
    if (!name.trim() || !date || !deadline) {
      alert('请填写所有字段');
      return;
    }
    addMarket(name, date, deadline);
    setName('');
    setDate('');
    setDeadline('');
  };

  const handleToggleStall = (marketId, stallId, isBooked) => {
    if (isBooked) {
      cancelStall(marketId, stallId);
    } else {
      bookStall(marketId, stallId, '其他' as Category, '管理员手动标记', 'admin');
    }
  };

  const totalStalls = markets.reduce((sum, m) => sum + m.totalStalls, 0);
  const bookedStalls = markets.reduce((sum, m) => sum + m.stalls.filter(s => s.booked).length, 0);
  const totalFeedbacks = markets.reduce((sum, m) => sum + m.feedbacks.length, 0);

  return (
    <div className="admin-panel fade-in">
      <h2>管理员后台</h2>

      <div className="admin-section">
        <h3>统计概览</h3>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#7b1fa2' }}>市场总数</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#4a148c' }}>{markets.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#7b1fa2' }}>总摊位数</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#4a148c' }}>{totalStalls}</div>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#7b1fa2' }}>已预订摊位</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ec407a' }}>{bookedStalls}</div>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#7b1fa2' }}>评价总数</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ab47bc' }}>{totalFeedbacks}</div>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <h3>创建新市场</h3>
        <div className="admin-form">
          <div className="admin-form-row">
            <label>活动名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入活动名称"
            />
          </div>
          <div className="admin-form-row">
            <label>活动日期</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="admin-form-row">
            <label>报名截止日期</label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>
          <button onClick={handleCreateMarket} style={{ alignSelf: 'flex-start' }}>
            创建市场
          </button>
        </div>
      </div>

      <div className="admin-section">
        <h3>市场管理</h3>
        <div className="admin-market-list">
          {markets.map(market => {
            const booked = market.stalls.filter(s => s.booked).length;
            const isExpanded = expandedMarket === market.id;
            const stallClass = stall.booked ? 'occupied' : 'empty';
            return (
              <div key={market.id} className="admin-market-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="admin-market-info">
                    <h4>{market.name}</h4>
                    <p>日期：{market.date} | 摊位：{booked}/{market.totalStalls}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => navigate('/market/' + market.id)}>查看详情</button>
                    <button
                      onClick={() => setExpandedMarket(isExpanded ? null : market.id)}
                      style={{ backgroundColor: '#ab47bc' }}
                    >
                      {isExpanded ? '收起' : '管理摊位'}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ fontSize: '13px', color: '#7b1fa2', marginBottom: '8px' }}>
                      点击摊位可手动标记预订/取消
                    </p>
                    <div className="admin-stalls">
                      {market.stalls.map(stall => (
                        <div
                          key={stall.id}
                          className={'admin-stall ' + (stall.booked ? 'occupied' : 'empty')}
                          onClick={() => handleToggleStall(market.id, stall.id, stall.booked)}
                        >
                          {stall.id}
                          {stall.booked && <br />}
                          {stall.booked && (stall.category ? stall.category.charAt(0) : '✓')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
;

fs.writeFileSync(path.join('src', 'client', 'components', 'AdminPanel.tsx'), adminPanelCode, 'utf8');
console.log('AdminPanel.tsx written successfully');
