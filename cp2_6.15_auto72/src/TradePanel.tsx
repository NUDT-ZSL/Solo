import React, { useState, useEffect } from 'react';

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

interface Holding {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  profit: number;
}

interface Portfolio {
  cash: number;
  totalAsset: number;
  marketValue: number;
  totalProfit: number;
  dailyProfit: number;
  holdings: Holding[];
}

interface TradePanelProps {
  marketData: MarketItem[];
  portfolio: Portfolio | null;
  selectedStock: string;
  onSelectStock: (symbol: string) => void;
  onTrade: (symbol: string, side: 'buy' | 'sell', quantity: number) => Promise<any>;
}

const TradePanel: React.FC<TradePanelProps> = ({ marketData, portfolio, selectedStock, onSelectStock, onTrade }) => {
  const [quantity, setQuantity] = useState<string>('100');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tradeLoading, setTradeLoading] = useState(false);

  const currentStock = marketData.find((s) => s.symbol === selectedStock);
  const currentHolding = portfolio?.holdings.find((h) => h.symbol === selectedStock);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleTrade = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 1000) {
      setMessage({ text: '数量必须为1-1000之间的整数', type: 'error' });
      return;
    }
    setTradeLoading(true);
    const result = await onTrade(selectedStock, side, qty);
    setTradeLoading(false);
    if (result?.success) {
      setMessage({ text: result.message, type: 'success' });
    } else {
      setMessage({ text: result?.error || '交易失败', type: 'error' });
    }
  };

  const totalCost = currentStock ? currentStock.price * (parseInt(quantity) || 0) : 0;

  return (
    <div style={styles.container} className="fade-in">
      <div style={styles.header}>
        <h2 style={styles.title}>交易面板</h2>
        {currentStock && (
          <div style={styles.priceInfo}>
            <span style={{ ...styles.price, color: currentStock.change >= 0 ? '#4caf50' : '#f44336' }}>
              {currentStock.price.toFixed(2)}
            </span>
            <span style={{ color: currentStock.change >= 0 ? '#4caf50' : '#f44336', fontSize: 13 }}>
              {currentStock.change >= 0 ? '+' : ''}{currentStock.change.toFixed(2)} ({currentStock.changePercent.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      <div style={styles.body}>
        <div style={styles.stockSelector}>
          <div style={styles.dropdown} onClick={() => setDropdownOpen(!dropdownOpen)}>
            <span style={styles.dropdownText}>
              {currentStock ? `${currentStock.symbol} - ${currentStock.name}` : '选择股票'}
            </span>
            <span style={{ ...styles.dropdownArrow, transform: dropdownOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
          </div>
          {dropdownOpen && (
            <div style={styles.dropdownMenu}>
              {marketData.map((stock) => (
                <div
                  key={stock.symbol}
                  style={{
                    ...styles.dropdownItem,
                    background: stock.symbol === selectedStock ? '#0f3460' : 'transparent',
                  }}
                  onClick={() => {
                    onSelectStock(stock.symbol);
                    setDropdownOpen(false);
                  }}
                >
                  <span style={styles.stockSymbol}>{stock.symbol}</span>
                  <span style={styles.stockName}>{stock.name}</span>
                  <span style={{ color: stock.change >= 0 ? '#4caf50' : '#f44336', fontSize: 13 }}>
                    {stock.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {currentStock && (
          <div style={styles.stockDetail}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>开盘</span>
              <span style={styles.detailValue}>{currentStock.open.toFixed(2)}</span>
              <span style={styles.detailLabel}>最高</span>
              <span style={styles.detailValue}>{currentStock.high.toFixed(2)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>收盘</span>
              <span style={styles.detailValue}>{currentStock.close.toFixed(2)}</span>
              <span style={styles.detailLabel}>最低</span>
              <span style={styles.detailValue}>{currentStock.low.toFixed(2)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>成交量</span>
              <span style={styles.detailValue}>{currentStock.volume.toLocaleString()}</span>
              <span style={styles.detailLabel}>持仓</span>
              <span style={styles.detailValue}>{currentHolding ? `${currentHolding.quantity}股` : '0股'}</span>
            </div>
          </div>
        )}

        <div style={styles.tradeForm}>
          <div style={styles.sideToggle}>
            <button
              style={{
                ...styles.sideBtn,
                ...(side === 'buy' ? styles.buyBtnActive : styles.sideBtnInactive),
              }}
              onClick={() => setSide('buy')}
            >
              买入
            </button>
            <button
              style={{
                ...styles.sideBtn,
                ...(side === 'sell' ? styles.sellBtnActive : styles.sideBtnInactive),
              }}
              onClick={() => setSide('sell')}
            >
              卖出
            </button>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>数量</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={styles.quantityInput}
            />
            <div style={styles.quickBtns}>
              {[100, 200, 500, 1000].map((q) => (
                <button key={q} style={styles.quickBtn} onClick={() => setQuantity(String(q))}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.costRow}>
            <span style={styles.detailLabel}>预估金额</span>
            <span style={styles.costValue}>¥{totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
          </div>

          {side === 'buy' && portfolio && (
            <div style={styles.costRow}>
              <span style={styles.detailLabel}>可用资金</span>
              <span style={styles.detailValue}>¥{portfolio.cash.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {side === 'sell' && currentHolding && (
            <div style={styles.costRow}>
              <span style={styles.detailLabel}>可卖数量</span>
              <span style={styles.detailValue}>{currentHolding.quantity}股</span>
            </div>
          )}

          <button
            style={{
              ...styles.tradeBtn,
              background: side === 'buy' ? '#4caf50' : '#f44336',
            }}
            onClick={handleTrade}
            disabled={tradeLoading}
          >
            {tradeLoading ? '处理中...' : side === 'buy' ? '确认买入' : '确认卖出'}
          </button>
        </div>

        {message && (
          <div style={{ ...styles.message, background: message.type === 'success' ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)', color: message.type === 'success' ? '#4caf50' : '#f44336' }}>
            {message.text}
          </div>
        )}
      </div>

      {portfolio && portfolio.holdings.length > 0 && (
        <div style={styles.holdingsSection}>
          <h3 style={styles.holdingsTitle}>当前持仓</h3>
          {portfolio.holdings.map((h) => {
            const stock = marketData.find((s) => s.symbol === h.symbol);
            return (
              <div key={h.symbol} style={styles.holdingItem} onClick={() => onSelectStock(h.symbol)}>
                <div style={styles.holdingLeft}>
                  <span style={styles.holdingSymbol}>{h.symbol}</span>
                  <span style={styles.holdingName}>{stock?.name || h.symbol}</span>
                </div>
                <div style={styles.holdingRight}>
                  <span style={styles.holdingQty}>{h.quantity}股</span>
                  <span style={{ color: h.profit >= 0 ? '#4caf50' : '#f44336', fontSize: 13 }}>
                    {h.profit >= 0 ? '+' : ''}{h.profit.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#16213e',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 480,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid #0f3460',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e0e0e0',
    margin: 0,
  },
  priceInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: 700,
  },
  body: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  stockSelector: {
    position: 'relative' as const,
  },
  dropdown: {
    background: '#0f3460',
    borderRadius: 6,
    padding: '10px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    border: '1px solid #1a3a5c',
  },
  dropdownText: {
    color: '#e0e0e0',
    fontSize: 14,
  },
  dropdownArrow: {
    color: '#8892b0',
    fontSize: 10,
    transition: 'transform 0.2s ease',
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    background: '#0f3460',
    borderRadius: 6,
    marginTop: 4,
    zIndex: 50,
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 14px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  stockSymbol: {
    color: '#e94560',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 48,
  },
  stockName: {
    color: '#a0aec0',
    fontSize: 13,
    flex: 1,
  },
  stockDetail: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    padding: '8px 0',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#8892b0',
    fontSize: 12,
    minWidth: 60,
  },
  detailValue: {
    color: '#e0e0e0',
    fontSize: 13,
    flex: 1,
    textAlign: 'right' as const,
  },
  tradeForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    paddingTop: 8,
  },
  sideToggle: {
    display: 'flex',
    gap: 8,
  },
  sideBtn: {
    flex: 1,
    padding: '8px 0',
    borderRadius: 8,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buyBtnActive: {
    background: '#4caf50',
    color: '#fff',
  },
  sellBtnActive: {
    background: '#f44336',
    color: '#fff',
  },
  sideBtnInactive: {
    background: 'rgba(255,255,255,0.05)',
    color: '#8892b0',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  inputLabel: {
    color: '#8892b0',
    fontSize: 12,
  },
  quantityInput: {
    background: '#0f3460',
    border: '1px solid #1a3a5c',
    borderRadius: 6,
    padding: '10px 14px',
    color: '#e0e0e0',
    fontSize: 16,
    outline: 'none',
    width: '100%',
  },
  quickBtns: {
    display: 'flex',
    gap: 6,
    marginTop: 4,
  },
  quickBtn: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid #1a3a5c',
    borderRadius: 4,
    color: '#8892b0',
    fontSize: 12,
    padding: '4px 0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  costRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costValue: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: 600,
  },
  tradeBtn: {
    borderRadius: 8,
    border: 'none',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    padding: '10px 0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: 4,
  },
  message: {
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: 13,
    textAlign: 'center' as const,
    marginTop: 8,
  },
  holdingsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #0f3460',
  },
  holdingsTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#a0aec0',
    marginBottom: 8,
  },
  holdingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  holdingLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  holdingSymbol: {
    color: '#e94560',
    fontSize: 13,
    fontWeight: 600,
  },
  holdingName: {
    color: '#8892b0',
    fontSize: 12,
  },
  holdingRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  holdingQty: {
    color: '#e0e0e0',
    fontSize: 13,
  },
};

export default TradePanel;
