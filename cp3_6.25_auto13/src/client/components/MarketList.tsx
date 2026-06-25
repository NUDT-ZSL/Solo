import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { Stall } from '../types';

const MarketList = () => {
  const { markets } = useApp();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filteredMarkets = markets.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const getBookedCount = (stalls: Stall[]) =>
    stalls.filter(s => s.booked).length;

  return (
    <div className="market-list fade-in">
      <div className="search-box">
        <input
          type="text"
          placeholder="搜索市场名称..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="market-grid">
        {filteredMarkets.map(market => {
          const booked = getBookedCount(market.stalls);
          return (
            <div
              key={market.id}
              className="market-card"
              onClick={() => navigate('/market/' + market.id)}
            >
              <div>
                <h3>{market.name}</h3>
                <div className="date">活动日期：{market.date}</div>
                <div className="stall-info">
                  {'摊位：' + booked + '/' + market.totalStalls + ' 已预订'}
                </div>
                <div className="deadline">报名截止：{market.deadline}</div>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  navigate('/market/' + market.id);
                }}
              >
                立即报名
              </button>
            </div>
          );
        })}
      </div>
      {filteredMarkets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#7b1fa2' }}>
          未找到匹配的市场
        </div>
      )}
    </div>
  );
};

export default MarketList;