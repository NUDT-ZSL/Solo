import { useState, useEffect } from 'react';
import type { Coupon, RedeemData } from '../types';
import { api } from '../api';
import { useAppContext } from '../App';

interface CouponDetailProps {
  couponId: string;
  onBack: () => void;
}

export default function CouponDetail({ couponId, onBack }: CouponDetailProps) {
  const { showToast } = useAppContext();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RedeemData>({ order_amount: '', note: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const c = await api.getCoupon(couponId);
        if (mounted) setCoupon(c);
      } catch {
        showToast('加载优惠券失败', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [couponId, showToast]);

  const validate = (field: keyof RedeemData, value: any): string => {
    if (!coupon) return '';
    if (field === 'order_amount') {
      const v = Number(value);
      if (value === '' || isNaN(v) || v <= 0) return '请输入有效的订单金额';
      if (v < coupon.threshold) return `订单金额不能小于使用门槛 ¥${coupon.threshold}`;
      return '';
    }
    if (field === 'note') {
      if (value && value.length > 50) return '备注最多50个字符';
      return '';
    }
    return '';
  };

  const handleBlur = (field: keyof RedeemData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validate(field, form[field]) }));
  };

  const handleChange = (field: keyof RedeemData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: validate(field, value) }));
    }
  };

  const isFormValid = (): boolean => {
    const amtErr = validate('order_amount', form.order_amount);
    const noteErr = validate('note', form.note);
    setErrors({ order_amount: amtErr, note: noteErr });
    setTouched({ order_amount: true, note: true });
    return !amtErr && !noteErr;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setShowModal(true);
  };

  const confirmRedeem = async () => {
    if (!coupon) return;
    setSubmitting(true);
    try {
      const payload = {
        order_amount: Number(form.order_amount),
        note: form.note,
      };
      const res = await api.redeemCoupon(coupon.id, payload);
      setShowModal(false);
      showToast(`核销成功！已节省 ¥${res.saved}`, 'success');
      setForm({ order_amount: '', note: '' });
      setTouched({});
      setErrors({});
      const updated = await api.getCoupon(coupon.id);
      setCoupon(updated);
    } catch (err: any) {
      const msg = err.message;
      if (typeof msg === 'object' && msg !== null) {
        setErrors(msg as Record<string, string>);
        showToast('请检查核销信息', 'error');
      } else {
        showToast(String(msg) || '核销失败', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <button className="back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          返回列表
        </button>
        <div className="detail-view">
          <div className="skeleton-card">
            <div className="skeleton-line amount" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
          <div className="skeleton-card">
            <div className="skeleton-line medium" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        </div>
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="empty-state">
        <h3>优惠券不存在</h3>
        <button className="back-btn" onClick={onBack}>返回列表</button>
      </div>
    );
  }

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        返回列表
      </button>

      <div className="detail-view">
        <div className="detail-card">
          <h2>{coupon.name}</h2>
          <span
            className={`status-tag ${coupon.status === 'expired' ? 'expired' : coupon.status === 'sold_out' ? 'sold-out' : coupon.today_remaining <= 0 ? 'today-limit' : 'active'}`}
            style={{ display: 'inline-block', marginTop: 4 }}
          >
            {coupon.status === 'expired' ? '已过期' : coupon.status === 'sold_out' ? '已用罄' : coupon.today_remaining <= 0 ? '今日已领完' : '进行中'}
          </span>
          <div className="detail-amount">
            <small>¥</small>{coupon.amount}
          </div>
          <div className="detail-info">
            <div className="detail-info-row">
              <span className="label">使用门槛</span>
              <span className="value">满 ¥{coupon.threshold} 可用</span>
            </div>
            <div className="detail-info-row">
              <span className="label">有效期</span>
              <span className="value">{coupon.start_date} 至 {coupon.end_date}</span>
            </div>
            <div className="detail-info-row">
              <span className="label">每日发放上限</span>
              <span className="value">{coupon.daily_limit} 张</span>
            </div>
            <div className="detail-info-row">
              <span className="label">今日剩余</span>
              <span className="value">{coupon.today_remaining} 张</span>
            </div>
            <div className="detail-info-row">
              <span className="label">累计领取</span>
              <span className="value">{coupon.total_claimed} 张</span>
            </div>
            <div className="detail-info-row">
              <span className="label">累计核销</span>
              <span className="value">{coupon.total_redeemed} 张</span>
            </div>
          </div>
        </div>

        <div className="detail-card redeem-form">
          <h3>核销优惠券</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">订单金额（元）<span style={{ color: '#EF4444' }}>*</span></label>
              <input
                type="number"
                className={`form-input ${touched.order_amount && errors.order_amount ? 'error' : ''}`}
                placeholder={`请输入订单金额，需满 ¥${coupon.threshold}`}
                value={form.order_amount}
                onChange={e => handleChange('order_amount', e.target.value)}
                onBlur={() => handleBlur('order_amount')}
                min={0}
                step="0.01"
              />
              {touched.order_amount && errors.order_amount && (
                <div className="error-message" style={{ color: '#EF4444', fontSize: '12px' }}>{errors.order_amount}</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">备注（可选）</label>
              <textarea
                className="form-textarea"
                placeholder="核销备注信息，最多50字"
                value={form.note}
                onChange={e => handleChange('note', e.target.value)}
                onBlur={() => handleBlur('note')}
                maxLength={100}
              />
              <div className="char-count">{form.note.length}/50</div>
              {touched.note && errors.note && (
                <div className="error-message" style={{ color: '#EF4444', fontSize: '12px' }}>{errors.note}</div>
              )}
            </div>
            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || coupon.status === 'expired'}
            >
              {submitting ? '核销中...' : coupon.status === 'expired' ? '已过期无法核销' : '确认核销'}
            </button>
          </form>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">确认核销</div>
            <div className="modal-body">
              <p>优惠券：<strong>{coupon.name}</strong></p>
              <p>面额：<strong style={{ color: '#FF6B35' }}>¥{coupon.amount}</strong></p>
              <p>订单金额：<strong>¥{form.order_amount}</strong></p>
              <p>实付金额：<strong style={{ color: '#10B981' }}>¥{(Number(form.order_amount) - coupon.amount).toFixed(2)}</strong></p>
              {form.note && <p>备注：{form.note}</p>}
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                取消
              </button>
              <button
                className="modal-btn confirm"
                onClick={confirmRedeem}
                disabled={submitting}
              >
                {submitting ? '处理中...' : '确认核销'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
