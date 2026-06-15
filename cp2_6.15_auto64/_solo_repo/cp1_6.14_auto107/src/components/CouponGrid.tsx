import React, { useState, useEffect, useCallback } from 'react';
import { couponApi } from '../http';
import type { Coupon, CouponType } from '../types';

interface CouponGridProps {}

const typeLabels: Record<CouponType, string> = {
  fullReduction: '满减券',
  discount: '折扣券',
  exchange: '兑换券',
};

const formatExpireDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const getCouponDisplay = (coupon: Coupon): string => {
  switch (coupon.type) {
    case 'fullReduction':
      return `满${coupon.threshold}减${coupon.value}`;
    case 'discount':
      return `${(coupon.value / 10).toFixed(1)}折`;
    case 'exchange':
      return `${coupon.value}积分兑换`;
    default:
      return coupon.name;
  }
};

const CouponGrid: React.FC<CouponGridProps> = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    type: 'fullReduction' as CouponType,
    name: '',
    value: '',
    threshold: '',
    expireDate: '',
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const startTime = performance.now();
      const data = await couponApi.getAll();
      const elapsed = performance.now() - startTime;
      const delay = Math.max(0, 150 - elapsed);
      await new Promise((r) => setTimeout(r, delay));
      setCoupons(data);
    } catch (e) {
      console.error('Load coupons failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      type: 'fullReduction',
      name: '',
      value: '',
      threshold: '',
      expireDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      type: coupon.type,
      name: coupon.name,
      value: String(coupon.value),
      threshold: coupon.threshold ? String(coupon.threshold) : '',
      expireDate: coupon.expireDate.split('T')[0],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCoupon(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.value || !formData.expireDate) return;

    try {
      const payload: Partial<Coupon> = {
        type: formData.type,
        name: formData.name,
        value: parseFloat(formData.value),
        expireDate: new Date(formData.expireDate).toISOString(),
      };
      if (formData.type === 'fullReduction' && formData.threshold) {
        payload.threshold = parseFloat(formData.threshold);
      }

      if (editingCoupon) {
        await couponApi.update(editingCoupon.id, payload);
      } else {
        await couponApi.create(payload);
      }
      closeModal();
      loadCoupons();
    } catch (e) {
      console.error('Save coupon failed:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该优惠券吗？')) return;
    try {
      await couponApi.remove(id);
      loadCoupons();
    } catch (e) {
      console.error('Delete coupon failed:', e);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#3e2723' }}>
          优惠券中心
        </h2>
        <button
          onClick={openCreateModal}
          style={{
            padding: '8px 18px',
            backgroundColor: '#d4a373',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            transition: 'background-color 0.2s ease',
          }}
        >
          + 新增优惠券
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9e9e9e' }}>
          加载中...
        </div>
      ) : coupons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9e9e9e' }}>
          暂无优惠券，点击右上角按钮创建
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 200px)',
            gap: '16px',
            justifyContent: 'flex-start',
          }}
        >
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              onMouseEnter={() => setHoveredId(coupon.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                width: '200px',
                height: '120px',
                borderRadius: '10px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                padding: '14px 14px 14px 18px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                transform: hoveredId === coupon.id ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow:
                  hoveredId === coupon.id
                    ? '0 6px 20px rgba(0,0,0,0.08)'
                    : 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: coupon.isExpired ? '#95a5a6' : '#27ae60',
                  flexShrink: 0,
                }}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: '#8c7853',
                    backgroundColor: 'rgba(212, 163, 115, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 500,
                  }}
                >
                  {typeLabels[coupon.type]}
                </div>
              </div>

              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#3e2723',
                  marginBottom: '6px',
                  lineHeight: 1.3,
                }}
              >
                {coupon.name}
              </div>

              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#d4a373',
                  marginBottom: '6px',
                  lineHeight: 1,
                }}
              >
                {getCouponDisplay(coupon)}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: coupon.isExpired ? '#95a5a6' : '#757575',
                  marginTop: 'auto',
                  opacity: coupon.isExpired ? 0.7 : 1,
                }}
              >
                {coupon.isExpired ? '已过期 · ' : '有效期至 '}
                {formatExpireDate(coupon.expireDate)}
              </div>

              {hoveredId === coupon.id && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    display: 'flex',
                    gap: '4px',
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(coupon);
                    }}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: '1px solid #e9ecef',
                      fontSize: '12px',
                      color: '#3e2723',
                      lineHeight: '24px',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(coupon.id);
                    }}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: '1px solid #e9ecef',
                      fontSize: '14px',
                      color: '#e74c3c',
                      lineHeight: '24px',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.45)',
            animation: 'modalFadeIn 0.3s ease',
          }}
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '420px',
              maxWidth: 'calc(100vw - 32px)',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              animation: 'modalContentScale 0.3s ease',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              {editingCoupon ? '编辑优惠券' : '新增优惠券'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={fieldLabel}>类型</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as CouponType })
                  }
                  style={fieldInput}
                >
                  <option value="fullReduction">满减券</option>
                  <option value="discount">折扣券</option>
                  <option value="exchange">兑换券</option>
                </select>
              </div>

              <div>
                <label style={fieldLabel}>名称</label>
                <input
                  type="text"
                  placeholder="如：满50减10券"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={fieldInput}
                />
              </div>

              {formData.type === 'fullReduction' && (
                <div>
                  <label style={fieldLabel}>满减门槛（元）</label>
                  <input
                    type="number"
                    placeholder="如：50"
                    value={formData.threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, threshold: e.target.value })
                    }
                    style={fieldInput}
                  />
                </div>
              )}

              <div>
                <label style={fieldLabel}>
                  {formData.type === 'fullReduction'
                    ? '减免金额（元）'
                    : formData.type === 'discount'
                    ? '折扣（如88表示8.8折）'
                    : '所需积分'}
                </label>
                <input
                  type="number"
                  placeholder={
                    formData.type === 'fullReduction'
                      ? '如：10'
                      : formData.type === 'discount'
                      ? '如：88'
                      : '如：50'
                  }
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  style={fieldInput}
                />
              </div>

              <div>
                <label style={fieldLabel}>有效期至</label>
                <input
                  type="date"
                  value={formData.expireDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expireDate: e.target.value })
                  }
                  style={fieldInput}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '24px',
              }}
            >
              <button onClick={closeModal} style={cancelBtn}>
                取消
              </button>
              <button onClick={handleSubmit} style={confirmBtn}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: '#3e2723',
  marginBottom: '6px',
};

const fieldInput: React.CSSProperties = {
  width: '100%',
  height: '40px',
  padding: '0 14px',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#3e2723',
  backgroundColor: '#fff',
};

const cancelBtn: React.CSSProperties = {
  padding: '8px 20px',
  backgroundColor: 'transparent',
  color: '#3e2723',
  fontSize: '14px',
  fontWeight: 500,
  borderRadius: '8px',
  border: '1px solid #e9ecef',
  transition: 'all 0.2s ease',
};

const confirmBtn: React.CSSProperties = {
  padding: '8px 20px',
  backgroundColor: '#d4a373',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  transition: 'background-color 0.2s ease',
};

export default CouponGrid;
