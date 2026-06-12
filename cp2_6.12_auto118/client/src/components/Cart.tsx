import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CartItem } from '../types';
import { worksApi } from '../api';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (workId: string, delta: number) => void;
  onClear: () => void;
  totalPrice: number;
}

const Cart = ({ isOpen, onClose, items, onUpdateQuantity, onClear, totalPrice }: CartProps) => {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      setError('请填写姓名');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请填写正确的手机号');
      return;
    }
    if (items.length === 0) {
      setError('购物车为空');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const orderItems = items.map(item => ({
        workId: item.work.id,
        name: item.work.name,
        price: item.work.price,
        quantity: item.quantity
      }));

      await worksApi.createOrder({
        customer_name: customerName,
        phone,
        items: orderItems,
        total_price: totalPrice
      });

      setShowSuccess(true);
      onClear();
      setCustomerName('');
      setPhone('');

      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch {
      setError('订单提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                zIndex: 2000
              }}
            />
            <motion.div
              initial={{ x: 350 }}
              animate={{ x: 0 }}
              exit={{ x: 350 }}
              transition={{ type: 'tween', duration: 0.3 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: 350,
                height: '100vh',
                backgroundColor: 'white',
                boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
                zIndex: 2001,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  padding: '20px 20px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#4a3728', marginBottom: 4 }}>购物车</h3>
                  <p style={{ fontSize: 14, color: '#8B5E3C', fontWeight: 600 }}>
                    总计: ¥{totalPrice.toFixed(2)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {items.length > 0 && (
                    <button
                      onClick={onClear}
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        backgroundColor: '#f5f5f5',
                        color: '#666',
                        borderRadius: 6
                      }}
                    >
                      清空
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    style={{ background: 'none', padding: 4, fontSize: 20, color: '#999' }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {items.length === 0 ? (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999'
                    }}
                  >
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    <p style={{ marginTop: 12, fontSize: 14 }}>购物车还是空的</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {items.map(item => (
                      <motion.div
                        key={item.work.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        style={{
                          display: 'flex',
                          gap: 12,
                          padding: 12,
                          backgroundColor: '#fafafa',
                          borderRadius: 10
                        }}
                      >
                        <img
                          src={item.work.image}
                          alt={item.work.name}
                          loading="lazy"
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 8,
                            objectFit: 'cover'
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#4a3728', marginBottom: 4 }}>
                            {item.work.name}
                          </h4>
                          <p style={{ fontSize: 13, color: '#8B5E3C', fontWeight: 600, marginBottom: 8 }}>
                            ¥{item.work.price}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              onClick={() => onUpdateQuantity(item.work.id, -1)}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                backgroundColor: '#f0f0f0',
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#4a3728'
                              }}
                            >
                              -
                            </button>
                            <motion.span
                              key={item.quantity}
                              initial={{ scale: 1.3 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.3 }}
                              style={{
                                minWidth: 24,
                                textAlign: 'center',
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#4a3728'
                              }}
                            >
                              {item.quantity}
                            </motion.span>
                            <button
                              onClick={() => onUpdateQuantity(item.work.id, 1)}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                backgroundColor: '#f0f0f0',
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#4a3728'
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div
                  style={{
                    padding: 16,
                    borderTop: '1px solid #f0f0f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <input
                    type="text"
                    placeholder="请输入姓名"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e0e0e0',
                      borderRadius: 8,
                      fontSize: 14
                    }}
                  />
                  <input
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e0e0e0',
                      borderRadius: 8,
                      fontSize: 14
                    }}
                  />
                  {error && (
                    <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#8B5E3C',
                      color: 'white',
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: 600
                    }}
                  >
                    {isSubmitting ? '提交中...' : '确认下单'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            style={{
              position: 'fixed',
              top: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 24px',
              backgroundColor: '#22c55e',
              color: 'white',
              borderRadius: 10,
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            订单提交成功！
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Cart;
