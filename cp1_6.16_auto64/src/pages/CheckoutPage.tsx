import React, { useState } from 'react';
import { Cart, CartItem, ShippingInfo, OrderRequest } from '../types';
import { calculateTotal } from '../cart/cartService';

interface CheckoutPageProps {
  cart: Cart;
  onOrderComplete: (orderId: string) => void;
  onBack: () => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cart, onOrderComplete, onBack }) => {
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: '',
    phone: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { total, discount, finalTotal } = calculateTotal(cart);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!shippingInfo.name.trim()) {
      errors.name = '请输入姓名';
    }
    if (!shippingInfo.phone.trim()) {
      errors.phone = '请输入电话';
    } else if (!/^\d{11}$/.test(shippingInfo.phone)) {
      errors.phone = '电话必须为11位数字';
    }
    if (!shippingInfo.address.trim()) {
      errors.address = '请输入地址';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const orderRequest: OrderRequest = {
      items: cart.items,
      total,
      discount,
      finalTotal,
      shippingInfo,
    };
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderRequest),
      });
      const data = await response.json();
      onOrderComplete(data.orderId);
    } catch {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (field: keyof ShippingInfo, value: string) => {
    setShippingInfo((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (cart.items.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 18, color: '#7F8C8D', margin: '40px 0' }}>购物车为空</p>
        <button
          onClick={onBack}
          style={{
            padding: '12px 32px',
            background: '#3498DB',
            color: '#FFF',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 32,
        background: '#FFF',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        minHeight: '100vh',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 18,
            cursor: 'pointer',
            marginRight: 12,
            color: '#3498DB',
            padding: 0,
          }}
        >
          ← 返回
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>结算</h1>
      </div>

      <table className="order-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ background: '#34495E', color: '#FFF' }}>
            <th style={{ padding: '12px 16px', textAlign: 'left' }}>商品</th>
            <th style={{ padding: '12px 16px', textAlign: 'center' }}>单价</th>
            <th style={{ padding: '12px 16px', textAlign: 'center' }}>数量</th>
            <th style={{ padding: '12px 16px', textAlign: 'right' }}>小计</th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item: CartItem, index: number) => (
            <tr
              key={item.id}
              style={{
                background: index % 2 === 1 ? '#F2F4F4' : '#FFF',
              }}
            >
              <td style={{ padding: '12px 16px' }}>
                <div style={{ fontWeight: 500 }}>{item.productName}</div>
                <div style={{ fontSize: 12, color: '#95A5A6', marginTop: 2 }}>{item.stallName}</div>
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}>¥{item.price.toFixed(2)}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>¥{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>
              商品合计
            </td>
            <td style={{ padding: '12px 16px', textAlign: 'right' }}>¥{total.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={3} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>
              优惠折扣
            </td>
            <td style={{ padding: '12px 16px', textAlign: 'right', color: discount > 0 ? '#27AE60' : undefined }}>
              {discount > 0 ? `-¥${discount.toFixed(2)}` : '¥0.00'}
              {discount > 0 && (
                <span style={{ fontSize: 11, color: '#27AE60', marginLeft: 4 }}>(满100减10%优惠)</span>
              )}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: 16 }}>
              应付金额
            </td>
            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: 18, color: '#E74C3C' }}>
              ¥{finalTotal.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>收货信息</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>姓名</label>
          <input
            type="text"
            value={shippingInfo.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="请输入姓名"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: `1px solid ${formErrors.name ? '#E74C3C' : '#DDD'}`,
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              if (!formErrors.name) e.currentTarget.style.borderColor = '#3498DB';
            }}
            onBlur={(e) => {
              if (!formErrors.name) e.currentTarget.style.borderColor = '#DDD';
            }}
          />
          {formErrors.name && (
            <div style={{ color: '#E74C3C', fontSize: 12, marginTop: 4 }}>{formErrors.name}</div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>电话</label>
          <input
            type="text"
            value={shippingInfo.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="请输入电话"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: `1px solid ${formErrors.phone ? '#E74C3C' : '#DDD'}`,
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              if (!formErrors.phone) e.currentTarget.style.borderColor = '#3498DB';
            }}
            onBlur={(e) => {
              if (!formErrors.phone) e.currentTarget.style.borderColor = '#DDD';
            }}
          />
          {formErrors.phone && (
            <div style={{ color: '#E74C3C', fontSize: 12, marginTop: 4 }}>{formErrors.phone}</div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>地址</label>
          <input
            type="text"
            value={shippingInfo.address}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            placeholder="请输入地址"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: `1px solid ${formErrors.address ? '#E74C3C' : '#DDD'}`,
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              if (!formErrors.address) e.currentTarget.style.borderColor = '#3498DB';
            }}
            onBlur={(e) => {
              if (!formErrors.address) e.currentTarget.style.borderColor = '#DDD';
            }}
          />
          {formErrors.address && (
            <div style={{ color: '#E74C3C', fontSize: 12, marginTop: 4 }}>{formErrors.address}</div>
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={cart.items.length === 0 || submitting}
        style={{
          width: '100%',
          padding: 14,
          background: submitting || cart.items.length === 0 ? '#BDC3C7' : '#3498DB',
          color: '#FFF',
          border: 'none',
          borderRadius: 10,
          fontSize: 16,
          fontWeight: 600,
          cursor: submitting || cart.items.length === 0 ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!submitting && cart.items.length > 0) e.currentTarget.style.background = '#2980B9';
        }}
        onMouseLeave={(e) => {
          if (!submitting && cart.items.length > 0) e.currentTarget.style.background = '#3498DB';
        }}
      >
        {submitting && (
          <span
            className="spinLoader"
            style={{
              display: 'inline-block',
              width: 20,
              height: 20,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#FFF',
              borderRadius: '50%',
              animation: 'spinLoader 0.8s linear infinite',
            }}
          />
        )}
        {submitting ? '提交中...' : '提交订单'}
      </button>
    </div>
  );
};

export default CheckoutPage;
