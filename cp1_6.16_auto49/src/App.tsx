import React, { useState, useCallback, useRef } from 'react';
import { useFlowerData } from './hooks/useFlowerData';
import FlowerSelector from './components/FlowerSelector';
import BouquetCanvas from './components/BouquetCanvas';
import {
  validateColorHarmony,
  calculatePrice,
  assembleOrder,
} from './logic/bouquetLogic';
import type { Flower, SelectedFlower, Occasion } from './types';
import { WRAPPING_OPTIONS } from './types';
import './App.css';

const App: React.FC = () => {
  const { flowers, occasions, loading, error } = useFlowerData();
  const [selectedFlowers, setSelectedFlowers] = useState<SelectedFlower[]>([]);
  const [wrappingColor, setWrappingColor] = useState<string>(WRAPPING_OPTIONS[0].color);
  const [showOccasionPanel, setShowOccasionPanel] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationMsg, setValidationMsg] = useState('');
  const [priceFlash, setPriceFlash] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevTotalRef = useRef(0);

  const selectedIds = selectedFlowers.map((f) => f.id);

  const priceBreakdown = calculatePrice(selectedFlowers, wrappingColor);

  if (prevTotalRef.current !== priceBreakdown.total && priceBreakdown.total > 0) {
    prevTotalRef.current = priceBreakdown.total;
    setPriceFlash(true);
    setTimeout(() => setPriceFlash(false), 200);
  }

  const handleToggleFlower = useCallback(
    (flower: Flower) => {
      setSelectedFlowers((prev) => {
        const existing = prev.find((f) => f.id === flower.id);
        if (existing) {
          return prev.filter((f) => f.id !== flower.id);
        }

        const validation = validateColorHarmony([
          ...prev,
          { ...flower, quantity: 1, layoutX: 0, layoutY: 0, rotation: 0 },
        ]);
        if (!validation.valid) {
          setValidationMsg(validation.message);
          setTimeout(() => setValidationMsg(''), 3000);
          return prev;
        }

        return [
          ...prev,
          { ...flower, quantity: 1, layoutX: 0, layoutY: 0, rotation: 0 },
        ];
      });
    },
    []
  );

  const handleRemoveFlower = useCallback((flowerId: string) => {
    setSelectedFlowers((prev) => prev.filter((f) => f.id !== flowerId));
  }, []);

  const handleLayoutChange = useCallback(
    (updated: SelectedFlower[]) => {
      setSelectedFlowers(updated);
    },
    []
  );

  const handleOccasionApply = useCallback(
    (occasion: Occasion) => {
      const occasionFlowers = occasion.recommendations
        .map((id) => flowers.find((f) => f.id === id))
        .filter((f): f is Flower => f !== undefined);

      const newSelected: SelectedFlower[] = occasionFlowers.map((f) => ({
        ...f,
        quantity: 1,
        layoutX: 0,
        layoutY: 0,
        rotation: 0,
      }));

      setSelectedFlowers(newSelected);
      setShowOccasionPanel(false);
    },
    [flowers]
  );

  const handleGenerateOrder = useCallback(() => {
    setShowOrderModal(true);
    setOrderId(null);
    setOrderMessage('');
  }, []);

  const handleSubmitOrder = useCallback(async () => {
    if (!canvasRef.current) return;

    const screenshot = canvasRef.current.toDataURL('image/png');
    const orderData = assembleOrder(
      selectedFlowers,
      screenshot,
      wrappingColor,
      orderMessage
    );

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      const data = await res.json();
      setOrderId(data.orderId);
    } catch {
      setOrderId('ERROR');
    } finally {
      setSubmitting(false);
    }
  }, [selectedFlowers, wrappingColor, orderMessage]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>花材加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <p>加载失败：{error}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌷 花束搭配工坊</h1>
        <p className="header-subtitle">选择花材 · 自由搭配 · 生成订单</p>
      </header>

      {validationMsg && (
        <div className="validation-toast">{validationMsg}</div>
      )}

      <div className="app-body">
        <div className="left-panel">
          <FlowerSelector
            flowers={flowers}
            selectedIds={selectedIds}
            onToggle={handleToggleFlower}
            onRemove={handleRemoveFlower}
            selectedFlowers={selectedFlowers}
          />
        </div>

        <div className="right-panel">
          <BouquetCanvas
            selectedFlowers={selectedFlowers}
            wrappingColor={wrappingColor}
            onWrappingChange={setWrappingColor}
            onLayoutChange={handleLayoutChange}
            canvasRef={canvasRef}
          />

          <div className="price-bar">
            <div className="price-detail">
              <span>花材小计：¥{priceBreakdown.flowerTotal}</span>
              <span>包装费：¥{priceBreakdown.wrappingFee}</span>
            </div>
            <div className={`price-total ${priceFlash ? 'flash' : ''}`}>
              合计：¥{priceBreakdown.total}
            </div>
          </div>

          <div className="action-bar">
            <button
              className="btn btn-occasion"
              onClick={() => setShowOccasionPanel(true)}
            >
              🎉 节日推荐
            </button>
            <button
              className="btn btn-order"
              onClick={handleGenerateOrder}
              disabled={selectedFlowers.length === 0}
            >
              📋 生成订单
            </button>
          </div>
        </div>
      </div>

      {showOccasionPanel && (
        <div className="overlay" onClick={() => setShowOccasionPanel(false)} />
      )}
      <div className={`occasion-panel ${showOccasionPanel ? 'open' : ''}`}>
        <div className="occasion-header">
          <h2>🎉 节日推荐</h2>
          <button
            className="close-btn"
            onClick={() => setShowOccasionPanel(false)}
          >
            ✕
          </button>
        </div>
        <div className="occasion-list">
          {occasions.map((occasion) => (
            <div key={occasion.id} className="occasion-card">
              <h3>{occasion.name}</h3>
              <p>{occasion.description}</p>
              <div className="occasion-discount">
                享{(occasion.discount * 100).toFixed(0)}折优惠
              </div>
              <button
                className="btn btn-apply"
                onClick={() => handleOccasionApply(occasion)}
              >
                一键搭配
              </button>
            </div>
          ))}
        </div>
      </div>

      {showOrderModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>📋 确认订单</h2>

            {canvasRef.current && (
              <div className="modal-preview">
                <img
                  src={canvasRef.current.toDataURL('image/png')}
                  alt="花束预览"
                />
              </div>
            )}

            <div className="modal-flowers">
              <h3>花材清单</h3>
              {selectedFlowers.map((f) => (
                <div key={f.id} className="modal-flower-item">
                  {f.name} × {f.quantity} — ¥{f.price * f.quantity}
                </div>
              ))}
            </div>

            <div className="modal-total">
              总价：¥{priceBreakdown.total}
            </div>

            <textarea
              className="modal-message"
              placeholder="留言（可选）"
              value={orderMessage}
              onChange={(e) => setOrderMessage(e.target.value)}
            />

            {orderId && (
              <div className="order-success">
                ✅ 订单已提交！订单号：
                <strong>{orderId}</strong>
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn btn-cancel"
                onClick={() => setShowOrderModal(false)}
              >
                取消
              </button>
              {!orderId && (
                <button
                  className="btn btn-confirm"
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                >
                  {submitting ? '提交中...' : '确认提交'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
