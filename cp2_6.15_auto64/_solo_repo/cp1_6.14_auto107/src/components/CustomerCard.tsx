import React, { useState, useEffect, useCallback } from 'react';
import { customerApi } from '../http';
import type { Customer, PointLog, CustomerLevel } from '../types';

interface CustomerCardProps {
  customer: Customer;
  onConsumeSuccess?: (reachedThreshold: boolean) => void;
  onCustomerUpdate?: (customer: Customer) => void;
}

const levelConfig: Record<CustomerLevel, { label: string; bgColor: string }> = {
  bronze: { label: '青铜', bgColor: '#e67e22' },
  silver: { label: '白银', bgColor: '#3498db' },
  gold: { label: '黄金', bgColor: '#f1c40f' },
  diamond: { label: '钻石', bgColor: '#bdc3c7' },
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '暂无消费';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今天消费';
  if (days === 1) return '昨天消费';
  if (days < 7) return `${days}天前消费`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onConsumeSuccess, onCustomerUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [consumeAmount, setConsumeAmount] = useState('');
  const [consumeLoading, setConsumeLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const level = levelConfig[customer.level];

  const loadPointLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const logs = await customerApi.getPointLogs(customer.id);
      setPointLogs(logs);
    } catch (e) {
      console.error('Load point logs failed:', e);
    } finally {
      setLogsLoading(false);
    }
  }, [customer.id]);

  const openModal = () => {
    setShowModal(true);
    loadPointLogs();
  };

  const closeModal = () => {
    setShowModal(false);
    setPointLogs([]);
  };

  const handleConsume = async () => {
    const amount = parseFloat(consumeAmount);
    if (!amount || amount <= 0) return;
    setConsumeLoading(true);
    try {
      const result = await customerApi.consume(customer.id, amount);
      if (onCustomerUpdate) onCustomerUpdate(result.customer);
      setConsumeAmount('');
      await loadPointLogs();
      if (onConsumeSuccess && result.reachedThreshold) {
        onConsumeSuccess(true);
      }
    } catch (e) {
      console.error('Consume failed:', e);
    } finally {
      setConsumeLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={openModal}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '280px',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          boxShadow: hovered
            ? '0 6px 24px rgba(0,0,0,0.08)'
            : '0 2px 12px rgba(0,0,0,0.04)',
          padding: '16px',
          position: 'relative',
          cursor: 'pointer',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '2px 10px',
            borderRadius: '10px',
            backgroundColor: level.bgColor,
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {level.label}
        </div>

        <div style={{ marginBottom: '12px', paddingRight: '56px' }}>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#3e2723',
              lineHeight: 1.2,
            }}
          >
            {customer.name}
          </div>
        </div>

        <div
          style={{
            fontSize: '14px',
            color: '#9e9e9e',
            marginBottom: '12px',
            letterSpacing: '0.5px',
          }}
        >
          {customer.phone}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '12px',
            borderTop: '1px solid #f0ece6',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#9e9e9e', marginBottom: '2px' }}>
              会员卡
            </div>
            <div style={{ fontSize: '13px', color: '#3e2723', fontWeight: 500 }}>
              {customer.cardNumber}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#d4a373',
                textAlign: 'right',
              }}
            >
              {customer.points}
              <span style={{ fontSize: '12px', fontWeight: 400, marginLeft: '2px' }}>
                积分
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#9e9e9e', textAlign: 'right' }}>
              {formatDate(customer.lastConsumeTime)}
            </div>
          </div>
        </div>
      </div>

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
              width: '520px',
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 48px)',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'modalContentScale 0.3s ease',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f0ece6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#3e2723' }}>
                    {customer.name}
                  </h3>
                  <span
                    style={{
                      padding: '2px 10px',
                      borderRadius: '10px',
                      backgroundColor: level.bgColor,
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {level.label}会员
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#9e9e9e', marginTop: '6px' }}>
                  {customer.phone} · {customer.cardNumber} · 当前 {customer.points} 积分
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'transparent',
                  fontSize: '20px',
                  color: '#9e9e9e',
                  lineHeight: '32px',
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0ece6' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>
                登记消费
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="number"
                  placeholder="请输入消费金额（元）"
                  value={consumeAmount}
                  onChange={(e) => setConsumeAmount(e.target.value)}
                  style={{
                    flex: 1,
                    height: '40px',
                    padding: '0 14px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#3e2723',
                  }}
                />
                <button
                  onClick={handleConsume}
                  disabled={consumeLoading}
                  style={{
                    padding: '0 20px',
                    height: '40px',
                    backgroundColor: '#d4a373',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    transition: 'background-color 0.2s ease',
                    opacity: consumeLoading ? 0.6 : 1,
                  }}
                >
                  {consumeLoading ? '处理中...' : '确认积分'}
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '6px' }}>
                每满10元积1分，满100积分可兑换礼品
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '20px 24px',
                minHeight: '200px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>
                积分变动记录
              </div>
              {logsLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#9e9e9e' }}>
                  加载中...
                </div>
              ) : pointLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#9e9e9e' }}>
                  暂无积分记录
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pointLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        backgroundColor: '#faf3e0',
                        borderRadius: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#3e2723' }}>
                          {log.reason} · ¥{log.amount}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '2px' }}>
                          {formatDateTime(log.createdAt)}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#27ae60',
                        }}
                      >
                        +{log.points}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerCard;
