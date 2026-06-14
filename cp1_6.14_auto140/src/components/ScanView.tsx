import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CardDetail, cardApi } from '../http';

const ScanView = () => {
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<CardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cardId) {
      loadCardDetail();
    }
  }, [cardId]);

  const loadCardDetail = async () => {
    try {
      setLoading(true);
      const data = await cardApi.getCardDetail(cardId!);
      setCard(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="scan-view">
        <div className="empty-state">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scan-view">
        <div className="status-message status-error" style={{ textAlign: 'center' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="scan-view">
        <div className="empty-state">未找到该会员卡信息</div>
      </div>
    );
  }

  const recentRecords = card.consumeRecords.slice(0, 5);

  return (
    <div className="scan-view">
      <div className="scan-title">☕ 小馆账本</div>

      <div className="scan-balance">
        <div className="scan-balance-label">账户余额</div>
        <div className="scan-balance-amount">¥{card.balance.toFixed(1)}</div>
        <div style={{ fontSize: '16px', color: '#f57c00', marginTop: '8px' }}>
          当前积分：{card.points} 分
        </div>
        <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '12px' }}>
          卡号：{card.cardNumber}
        </div>
      </div>

      <div className="scan-records-title">最近消费记录</div>

      {recentRecords.length > 0 ? (
        recentRecords.map((record) => (
          <div key={record.id} className="scan-record-item">
            <div className="scan-record-header">
              <span style={{ fontSize: '12px', color: '#7f8c8d' }}>{record.time}</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#c62828' }}>
                -¥{record.amount.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#5d4037' }}>剩余：¥{record.remainingBalance.toFixed(1)}</span>
              <span style={{ color: '#f57c00' }}>+{record.pointsEarned}积分</span>
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state" style={{ padding: '20px' }}>
          暂无消费记录
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#a1887f' }}>
        如需充值或兑换，请联系店员
      </div>
    </div>
  );
};

export default ScanView;
