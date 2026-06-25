import { useState } from 'react';
import { useApp } from '../App';
import { Market, Category } from '../types';
import FeedbackForm from './FeedbackForm';
import MarketStats from './MarketStats';

interface StallGridProps {
  market: Market;
}

const StallGrid = ({ market }: StallGridProps) => {
  const { bookStall, user } = useApp();
  const [selectedStall, setSelectedStall] = useState<number | null>(null);
  const [category, setCategory] = useState<Category>('二手书籍');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [showStats, setShowStats] = useState(false);

  const categories: Category[] = ['二手书籍', '手工艺品', '家居用品', '电子设备', '服饰配饰', '其他'];

  const handleStallClick = (stallId: number) => {
    const stall = market.stalls.find(s => s.id === stallId);
    if (stall && !stall.booked) {
      setSelectedStall(stallId);
    }
  };

  const handleSubmit = () => {
    if (selectedStall === null) return;
    if (!description.trim()) {
      alert('请填写商品简介');
      return;
    }
    if (!contact.trim()) {
      alert('请填写联系方式');
      return;
    }
    bookStall(market.id, selectedStall, category, description, contact);
    closeModal();
  };

  const closeModal = () => {
    setSelectedStall(null);
    setCategory('二手书籍');
    setDescription('');
    setContact('');
  };

  const getInitials = (name: string) => {
    return name ? name.charAt(0) : '?';
  };

  return (
    <div className={selectedStall !== null ? 'blur-bg' : ''}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => setShowStats(!showStats)}>
          {showStats ? '返回摊位图' : '查看统计数据'}
        </button>
      </div>

      {showStats ? (
        <MarketStats market={market} />
      ) : (
        <>
          <div className="stall-grid">
            {market.stalls.map(stall => (
              <div
                key={stall.id}
                className={'stall-cell ' + (stall.booked ? 'occupied' : 'empty')}
                onClick={() => handleStallClick(stall.id)}
              >
                {stall.booked ? (
                  <>
                    <div className="avatar">{getInitials(stall.userName || '')}</div>
                    {stall.category && <span className="category-tag">{stall.category}</span>}
                  </>
                ) : (
                  <span>{stall.id}</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#e0e0e0', borderRadius: '4px' }}></div>
              <span style={{ fontSize: '13px', color: '#6a1b9a' }}>空置摊位</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#ce93d8', borderRadius: '4px' }}></div>
              <span style={{ fontSize: '13px', color: '#6a1b9a' }}>已预订</span>
            </div>
          </div>

          {user && <FeedbackForm marketId={market.id} />}
        </>
      )}

      {selectedStall !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{'预订摊位 #' + selectedStall}</h3>

            <div>
              <label>商品类别</label>
              <select value={category} onChange={e => setCategory(e.target.value as Category)}>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label>商品简介（最多200字）</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 200))}
                placeholder="请简要描述您的商品..."
                maxLength={200}
              />
              <div style={{ fontSize: '12px', color: '#9e9e9e', textAlign: 'right' }}>
                {description.length + '/200'}
              </div>
            </div>

            <div>
              <label>联系方式</label>
              <input
                type="text"
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="请输入手机号或微信号"
              />
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeModal}>取消</button>
              <button onClick={handleSubmit}>确认预订</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StallGrid;