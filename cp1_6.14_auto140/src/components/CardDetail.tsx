import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { CardDetail as CardDetailType, ConsumeRecord, cardApi } from '../http';

interface RedeemItem {
  name: string;
  points: number;
}

interface CardDetailProps {
  cardId: string;
  onRecordsUpdate: (records: ConsumeRecord[]) => void;
  redeemItems: RedeemItem[];
}

const CardDetail = ({ cardId, onRecordsUpdate, redeemItems }: CardDetailProps) => {
  const [card, setCard] = useState<CardDetailType | null>(null);
  const [consumeAmount, setConsumeAmount] = useState('');
  const [selectedRedeemItem, setSelectedRedeemItem] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPulse, setShowPulse] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const pulseKeyRef = useRef(0);

  useEffect(() => {
    loadCardDetail();
  }, [cardId]);

  useEffect(() => {
    if (card) {
      const scanUrl = `${window.location.origin}/scan/${card.id}`;
      QRCode.toDataURL(scanUrl, { width: 180, margin: 2 })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('生成二维码失败:', err));
    }
  }, [card]);

  const loadCardDetail = async () => {
    try {
      const data = await cardApi.getCardDetail(cardId);
      setCard(data);
      onRecordsUpdate(data.consumeRecords);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载卡片详情失败';
      setStatus({ type: 'error', message });
    }
  };

  const handleConsume = async () => {
    const amount = parseFloat(consumeAmount);
    if (isNaN(amount) || amount <= 0) {
      setStatus({ type: 'error', message: '请输入有效的消费金额' });
      return;
    }
    if (card && amount > card.balance) {
      setStatus({ type: 'error', message: '余额不足' });
      return;
    }
    try {
      const data = await cardApi.consume(cardId, amount);
      setCard((prev) => prev ? { ...prev, balance: data.balance, points: data.points, consumeRecords: [data.record, ...prev.consumeRecords] } : null);
      onRecordsUpdate(card ? [data.record, ...card.consumeRecords] : [data.record]);
      setConsumeAmount('');
      pulseKeyRef.current += 1;
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 400);
      setStatus({ type: 'success', message: `消费成功！扣除¥${amount.toFixed(1)}，获得${data.record.pointsEarned}积分` });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : '消费失败';
      setStatus({ type: 'error', message });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleRedeem = async () => {
    const item = redeemItems.find(i => i.name === selectedRedeemItem);
    if (!item) {
      setStatus({ type: 'error', message: '请选择兑换项目' });
      return;
    }
    if (card && item.points > card.points) {
      setStatus({ type: 'error', message: '积分不足' });
      return;
    }
    try {
      const data = await cardApi.redeem(cardId, item.points, item.name);
      setCard((prev) => prev ? { ...prev, points: data.points, pointsLog: [data.log, ...prev.pointsLog] } : null);
      setSelectedRedeemItem('');
      setStatus({ type: 'success', message: `兑换成功！扣除${item.points}积分，获得「${item.name}」` });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : '兑换失败';
      setStatus({ type: 'error', message });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  if (!card) {
    return <div className="empty-state">加载中...</div>;
  }

  return (
    <div>
      <div className="card-header">
        <div className="card-avatar">
          ☕
          <div className="points-badge">{card.points}</div>
        </div>
        <div className="card-info">
          <div className="card-info-number">卡号：{card.cardNumber}</div>
          <div className="card-info-date">开户时间：{card.createdAt}</div>
        </div>
      </div>

      <div className="detail-balance-section">
        {showPulse && <div key={pulseKeyRef.current} className="pulse-animation" />}
        <div className="detail-balance-label">账户余额</div>
        <div className="detail-balance-amount">¥{card.balance.toFixed(1)}</div>
        <div className="detail-points">当前积分：{card.points} 分</div>
      </div>

      <div className="form-section">
        <div className="form-title">消费扣款</div>
        <div className="form-group">
          <label className="form-label">消费金额（元）</label>
          <input
            type="number"
            step="0.1"
            min="0"
            className="form-input"
            placeholder="请输入消费金额，如 35.5"
            value={consumeAmount}
            onChange={(e) => setConsumeAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConsume()}
          />
        </div>
        <button className="btn btn-primary" onClick={handleConsume}>
          确认扣款
        </button>
      </div>

      <div className="form-section">
        <div className="form-title">积分兑换</div>
        <div className="form-group">
          <label className="form-label">选择兑换项目</label>
          <select
            className="form-select"
            value={selectedRedeemItem}
            onChange={(e) => setSelectedRedeemItem(e.target.value)}
          >
            <option value="">请选择兑换项目</option>
            {redeemItems.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}（{item.points}积分）
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={handleRedeem}>
          确认兑换
        </button>
      </div>

      {status && (
        <div className={`status-message status-${status.type}`}>
          {status.message}
        </div>
      )}

      <div className="qrcode-section">
        <div className="form-title" style={{ marginBottom: '12px' }}>扫码查询余额</div>
        <div className="qrcode-container">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="扫码查询" style={{ width: 180, height: 180 }} />
          ) : (
            <div style={{ width: 180, height: 180, background: '#f5f0e8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1887f' }}>
              生成中...
            </div>
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
          顾客扫码即可查询余额和消费记录
        </div>
      </div>
    </div>
  );
};

export default CardDetail;
