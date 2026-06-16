import { useState } from 'react';
import ImageGrid from '../components/ImageGrid';
import useApi from '../hooks/useApi';
import type { ExchangeItem, Message } from '../types';
import dayjs from 'dayjs';
import './ExchangePage.css';

const typeLabels: Record<string, string> = {
  give: '赠送',
  want: '求购',
  exchange: '交换',
};

interface MessageModalProps {
  exchange: ExchangeItem | null;
  onClose: () => void;
}

function MessageModal({ exchange, onClose }: MessageModalProps) {
  const [content, setContent] = useState('');
  const [sent, setSent] = useState(false);
  const { request } = useApi<Message>('', { manual: true });

  if (!exchange) return null;

  const handleSend = async () => {
    if (!content.trim()) return;
    await request(`/exchanges/${exchange.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        fromUserId: 'u1',
        fromUserName: '我',
        content: content.trim(),
      }),
    });
    setSent(true);
  };

  // 简化的地图坐标
  const myPos = { lat: 31.235, lng: 121.46 };
  const otherPos = exchange.location;

  // 归一化坐标到百分比
  const minLat = Math.min(myPos.lat, otherPos.lat) - 0.01;
  const maxLat = Math.max(myPos.lat, otherPos.lat) + 0.01;
  const minLng = Math.min(myPos.lng, otherPos.lng) - 0.02;
  const maxLng = Math.max(myPos.lng, otherPos.lng) + 0.02;

  const latToY = (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * 100;
  const lngToX = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 100;

  const myX = lngToX(myPos.lng);
  const myY = latToY(myPos.lat);
  const otherX = lngToX(otherPos.lng);
  const otherY = latToY(otherPos.lat);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">发送私信</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__exchange-info">
          <span className={`exchange-tag exchange-tag--${exchange.type}`}>
            {typeLabels[exchange.type]}
          </span>
          <span className="modal__exchange-title">{exchange.title}</span>
        </div>

        <div className="map-container">
          <svg className="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#66bb6a" />
                <stop offset="100%" stopColor="#ef9a9a" />
              </linearGradient>
            </defs>

            {/* 简化的街道网格 */}
            {[20, 40, 60, 80].map((y) => (
              <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="#e8f5e9" strokeWidth="0.5" />
            ))}
            {[20, 40, 60, 80].map((x) => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2="100" stroke="#e8f5e9" strokeWidth="0.5" />
            ))}

            {/* 连线 */}
            <line
              x1={myX}
              y1={myY}
              x2={otherX}
              y2={otherY}
              stroke="url(#lineGradient)"
              strokeWidth="1.5"
              strokeDasharray="3,2"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-10"
                dur="1s"
                repeatCount="indefinite"
              />
            </line>

            {/* 我方标记 */}
            <circle cx={myX} cy={myY} r="4" fill="#66bb6a">
              <animate attributeName="r" values="4;5;4" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* 对方标记 */}
            <circle cx={otherX} cy={otherY} r="4" fill="#ef9a9a">
              <animate attributeName="r" values="4;5;4" dur="2s" repeatCount="indefinite" />
            </circle>
          </svg>

          <div className="map-labels">
            <div className="map-label map-label--me" style={{ left: `${myX}%`, top: `${myY}%` }}>
              <span className="map-label__dot" />
              <span className="map-label__text">我的位置</span>
            </div>
            <div className="map-label map-label--other" style={{ left: `${otherX}%`, top: `${otherY}%` }}>
              <span className="map-label__dot" />
              <span className="map-label__text">{otherPos.address}</span>
            </div>
          </div>
        </div>

        {sent ? (
          <div className="message-success">
            <span className="message-success__icon">✓</span>
            <span>私信已发送，等待对方回复～</span>
          </div>
        ) : (
          <>
            <textarea
              className="message-input"
              placeholder="说点什么吧..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <button className="send-btn" onClick={handleSend} disabled={!content.trim()}>
              发送私信
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ExchangePage() {
  const { data: exchanges, loading } = useApi<ExchangeItem[]>('/exchanges');
  const [selectedExchange, setSelectedExchange] = useState<ExchangeItem | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'give' | 'want' | 'exchange'>('all');

  const filteredExchanges = exchanges?.filter(
    (e) => activeTab === 'all' || e.type === activeTab
  );

  return (
    <div className="exchange-page">
      <div className="exchange-page__header">
        <h1 className="exchange-page__title">🔄 交换广场</h1>
        <p className="exchange-page__subtitle">和同城花友交换植物、分享扦插苗</p>
      </div>

      <div className="exchange-tabs">
        {[
          { key: 'all', label: '全部' },
          { key: 'give', label: '赠送' },
          { key: 'want', label: '求购' },
          { key: 'exchange', label: '交换' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`exchange-tab ${activeTab === tab.key ? 'exchange-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="exchange-grid">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          filteredExchanges?.map((item, idx) => (
            <div
              key={item.id}
              className="exchange-card"
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              <div className="exchange-card__header">
                <img src={item.userAvatar} alt="" className="exchange-card__avatar" />
                <div className="exchange-card__user-info">
                  <span className="exchange-card__username">{item.userName}</span>
                  <span className="exchange-card__time">{dayjs(item.createdAt).fromNow()}</span>
                </div>
                <span className={`exchange-tag exchange-tag--${item.type}`}>
                  {typeLabels[item.type]}
                </span>
              </div>

              <h3 className="exchange-card__title">{item.title}</h3>
              <p className="exchange-card__desc">{item.description}</p>

              {item.images.length > 0 && (
                <div className="exchange-card__images">
                  <ImageGrid images={item.images} size={120} max={3} />
                </div>
              )}

              <div className="exchange-card__footer">
                <span className="exchange-card__location">📍 {item.location.address}</span>
                <button
                  className="want-btn"
                  onClick={() => setSelectedExchange(item)}
                >
                  想要
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <MessageModal exchange={selectedExchange} onClose={() => setSelectedExchange(null)} />
    </div>
  );
}

export default ExchangePage;
