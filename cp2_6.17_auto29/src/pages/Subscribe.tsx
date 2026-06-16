import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { boxesAPI, ordersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import type { Box, DeliveryFrequency } from '../types';
import './Subscribe.css';

const Subscribe: React.FC = () => {
  const { boxId } = useParams<{ boxId: string }>();
  const navigate = useNavigate();
  const { member } = useAuth();
  const [box, setBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(true);
  const [frequency, setFrequency] = useState<DeliveryFrequency>('weekly');
  const [selectedSwaps, setSelectedSwaps] = useState<{ from: string; to: string }[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBox = async () => {
      if (!boxId) return;
      try {
        const res = await boxesAPI.getById(boxId);
        setBox(res.data);
      } catch (error) {
        console.error('Failed to fetch box:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBox();
  }, [boxId]);

  useEffect(() => {
    const tomorrow = dayjs().add(2, 'day');
    setDeliveryDate(tomorrow.format('YYYY-MM-DD'));
  }, []);

  const handleSwapToggle = (swap: { from: string; to: string }) => {
    setSelectedSwaps((prev) => {
      const exists = prev.find((s) => s.from === swap.from);
      if (exists) {
        return prev.filter((s) => s.from !== swap.from);
      }
      return [...prev, swap];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) {
      navigate('/login');
      return;
    }
    if (!box || !deliveryDate) return;

    setError('');
    setSubmitting(true);

    try {
      await ordersAPI.create({
        memberId: member.id,
        memberName: member.name,
        items: [
          {
            boxId: box.id,
            boxName: box.name,
            price: box.price,
            quantity,
            swaps: selectedSwaps,
          },
        ],
        totalPrice: box.price * quantity,
        frequency,
        deliveryDate,
        address: member.address,
        phone: member.phone,
        note,
      });
      navigate('/orders');
    } catch (error: any) {
      setError(error.response?.data?.message || '提交订单失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="subscribe-page container">
        <div className="loading-placeholder">加载中...</div>
      </div>
    );
  }

  if (!box) {
    return (
      <div className="subscribe-page container">
        <div className="error-placeholder">蔬菜箱不存在</div>
      </div>
    );
  }

  const totalPrice = box.price * quantity;

  return (
    <div className="subscribe-page container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="subscribe-content">
        <div className="box-detail-card">
          <div className="box-detail-header">
            <span className="size-badge">
              {box.size === 'small' ? '小箱' : box.size === 'medium' ? '中箱' : '大箱'}
            </span>
            <h1>{box.name}</h1>
            <div className="price-large">
              <span className="currency">¥</span>
              <span className="price">{box.price}</span>
              <span className="suffix">/箱</span>
            </div>
          </div>

          <div className="box-detail-section">
            <h3>蔬菜清单</h3>
            <div className="veggie-grid">
              {box.veggies.map((veggie) => (
                <div key={veggie.id} className="veggie-item">
                  <div
                    className="veggie-icon-large"
                    style={{ backgroundColor: veggie.color }}
                  >
                    {veggie.icon}
                  </div>
                  <span className="veggie-name">{veggie.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="box-detail-section">
            <h3>商品描述</h3>
            <p className="description">{box.description}</p>
          </div>
        </div>

        <div className="subscribe-form-card">
          <h2>订阅信息</h2>
          <form onSubmit={handleSubmit}>
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label>配送频率</label>
              <div className="frequency-options">
                <label
                  className={`frequency-option ${frequency === 'weekly' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="frequency"
                    value="weekly"
                    checked={frequency === 'weekly'}
                    onChange={(e) => setFrequency(e.target.value as DeliveryFrequency)}
                  />
                  <div className="option-content">
                    <span className="option-title">每周配送</span>
                    <span className="option-desc">每周固定时间送达</span>
                  </div>
                </label>
                <label
                  className={`frequency-option ${frequency === 'biweekly' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="frequency"
                    value="biweekly"
                    checked={frequency === 'biweekly'}
                    onChange={(e) => setFrequency(e.target.value as DeliveryFrequency)}
                  />
                  <div className="option-content">
                    <span className="option-title">每两周配送</span>
                    <span className="option-desc">隔周送达更灵活</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>首次配送日期</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={dayjs().add(1, 'day').format('YYYY-MM-DD')}
                required
              />
            </div>

            <div className="form-group">
              <label>购买数量</label>
              <div className="quantity-selector">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <span className="qty-value">{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {box.swapOptions.length > 0 && (
              <div className="form-group">
                <label>蔬菜替换（可选）</label>
                <div className="swap-options">
                  {box.swapOptions.map((swap, idx) => (
                    <label key={idx} className="swap-option">
                      <input
                        type="checkbox"
                        checked={selectedSwaps.some((s) => s.from === swap.from)}
                        onChange={() => handleSwapToggle(swap)}
                      />
                      <span className="swap-text">
                        {swap.from} → <strong>{swap.to}</strong>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>备注信息</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="如有特殊要求请在此说明"
                rows={3}
              />
            </div>

            <div className="order-summary">
              <div className="summary-row">
                <span>商品金额</span>
                <span>¥{box.price} × {quantity}</span>
              </div>
              <div className="summary-row total">
                <span>总计</span>
                <span className="total-price">¥{totalPrice}</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary submit-btn"
              disabled={submitting || !member}
            >
              {submitting ? '提交中...' : member ? '确认订阅' : '请先登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;
