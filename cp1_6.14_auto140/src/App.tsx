import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import CardList from './components/CardList';
import CardDetail from './components/CardDetail';
import ScanView from './components/ScanView';
import { Card, ConsumeRecord, PointsLog, cardApi } from './http';

interface RedeemItem {
  name: string;
  points: number;
}

const REDEEM_ITEMS: RedeemItem[] = [
  { name: '免费饮品一杯', points: 200 },
  { name: '蛋糕一块', points: 300 },
  { name: '咖啡礼盒', points: 500 },
];

type RightTab = 'consume' | 'points';

const MainPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(id || null);
  const [records, setRecords] = useState<ConsumeRecord[]>([]);
  const [pointsLog, setPointsLog] = useState<PointsLog[]>([]);
  const [rightTab, setRightTab] = useState<RightTab>('consume');
  const [showModal, setShowModal] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState(100);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    if (id) {
      setSelectedCardId(id);
    }
  }, [id]);

  const loadCards = async () => {
    try {
      const data = await cardApi.getCards();
      setCards(data);
      if (data.length > 0 && !selectedCardId) {
        setSelectedCardId(data[0].id);
        navigate(`/card/${data[0].id}`);
      }
    } catch (err) {
      console.error('加载卡片失败:', err);
    }
  };

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId);
    navigate(`/card/${cardId}`);
  };

  const handleRecordsUpdate = (newRecords: ConsumeRecord[]) => {
    setRecords(newRecords);
  };

  const handlePointsLogUpdate = (newPointsLog: PointsLog[]) => {
    setPointsLog(newPointsLog);
  };

  const handleCreateCard = async () => {
    try {
      const data = await cardApi.createCard({
        cardNumber: newCardNumber || undefined,
        initialBalance,
      });
      setCards([data, ...cards]);
      setSelectedCardId(data.id);
      navigate(`/card/${data.id}`);
      setShowModal(false);
      setNewCardNumber('');
      setInitialBalance(100);
      setStatus({ type: 'success', message: '会员卡创建成功！' });
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建失败';
      setStatus({ type: 'error', message });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const selectedCard = cards.find(c => c.id === selectedCardId);

  return (
    <div>
      <div className="top-bar">小馆账本</div>
      <div className="main-container">
        <div className="left-panel">
          <div style={{ padding: '16px 16px 0' }}>
            <div className="panel-title" style={{ marginBottom: 0 }}>会员卡列表</div>
          </div>
          <CardList
            cards={cards}
            selectedCardId={selectedCardId}
            onCardClick={handleCardClick}
          />
          <button className="btn btn-add" onClick={() => setShowModal(true)}>
            + 新增会员卡
          </button>
        </div>

        <div className="center-panel">
          <div className="panel-title">卡片详情</div>
          {selectedCard ? (
            <CardDetail
              cardId={selectedCard.id}
              onRecordsUpdate={handleRecordsUpdate}
              onPointsLogUpdate={handlePointsLogUpdate}
              redeemItems={REDEEM_ITEMS}
            />
          ) : (
            <div className="empty-state">请选择一张会员卡</div>
          )}
        </div>

        <div className="right-panel">
          <div className="tab-container">
            <div
              className={`tab-item ${rightTab === 'consume' ? 'active' : ''}`}
              onClick={() => setRightTab('consume')}
            >
              消费记录
            </div>
            <div
              className={`tab-item ${rightTab === 'points' ? 'active' : ''}`}
              onClick={() => setRightTab('points')}
            >
              积分日志
            </div>
          </div>

          {rightTab === 'consume' && (
            records.length > 0 ? (
              <ul className="record-list">
                {records.map((record) => (
                  <li key={record.id} className="record-item">
                    <span className="record-time">{record.time}</span>
                    <span className="record-amount">-¥{record.amount.toFixed(1)}</span>
                    <span className="record-balance">余¥{record.remainingBalance.toFixed(1)}</span>
                    <span className="record-points">+{record.pointsEarned}分</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                {selectedCard ? '暂无消费记录' : '请选择一张会员卡查看记录'}
              </div>
            )
          )}

          {rightTab === 'points' && (
            pointsLog.length > 0 ? (
              <ul className="points-log-list">
                {pointsLog.map((log) => (
                  <li key={log.id} className="points-log-item">
                    <span className="points-log-time">{log.time}</span>
                    <span className="points-log-item-name">{log.item}</span>
                    <span className="points-log-points">-{log.points}分</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                {selectedCard ? '暂无积分兑换记录' : '请选择一张会员卡查看记录'}
              </div>
            )
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">新增会员卡</div>
            <div className="form-group">
              <label className="form-label">卡片号（选填，自动生成）</label>
              <input
                type="text"
                className="form-input"
                placeholder="输入卡号或留空自动生成"
                value={newCardNumber}
                onChange={(e) => setNewCardNumber(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">初始金额</label>
              <div className="balance-options">
                {[50, 100, 200].map((amount) => (
                  <button
                    key={amount}
                    className={`balance-option ${initialBalance === amount ? 'selected' : ''}`}
                    onClick={() => setInitialBalance(amount)}
                  >
                    ¥{amount}
                  </button>
                ))}
              </div>
            </div>
            {status && (
              <div className={`status-message status-${status.type}`}>
                {status.message}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateCard}>
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/card" replace />} />
      <Route path="/card" element={<MainPage />} />
      <Route path="/card/:id" element={<MainPage />} />
      <Route path="/scan/:cardId" element={<ScanView />} />
    </Routes>
  );
};

export default App;
